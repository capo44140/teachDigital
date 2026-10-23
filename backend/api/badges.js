/**
 * Routes des badges, montées sur /badges par api/index.js
 * (requireAdminForWrites : lecture pour tout membre, écriture et check-unlock parents).
 */
const express = require('express');
const { pool } = require('../lib/database.js');
const { createResponse } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { requireProfileAccess } = require('../lib/scope.js');
const { validate } = require('../lib/validation.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');
const {
  badgeCreateSchema,
  badgeUpdateSchema,
  badgeCheckUnlockSchema,
  recentBadgesQuerySchema
} = require('../lib/schemas.js');

const router = express.Router();

const BADGE_COLUMNS = ['name', 'description', 'icon', 'category', 'condition_type', 'condition_value', 'points', 'color', 'is_active'];

function query(text, params, operation, timeout = TIMEOUTS.STANDARD) {
  return withQueryTimeout(pool.query(text, params).then(result => result.rows), timeout, operation);
}

// Réponse JSON d'un handler async ; toute exception devient une réponse d'erreur standard
function route(defaultMessage, handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendError(res, error, defaultMessage);
    }
  };
}

// ID de badge valide, sinon 400 (renvoie null)
function badgeIdOrReply(req, res) {
  const id = parseId(req.params.id);
  if (!id) sendFailure(res, 400, 'ID de badge invalide', 'BAD_REQUEST');
  return id;
}

// GET / : tous les badges
router.get('/', route('Erreur lors de la récupération des badges', async (req, res) => {
  const badges = await query('SELECT * FROM badges ORDER BY category, condition_value ASC', [], 'récupération de tous les badges');
  res.status(200).json(createResponse('Badges récupérés avec succès', badges));
}));

// POST / : créer un badge (parent)
router.post('/', validate(badgeCreateSchema), route('Erreur lors de la création du badge', async (req, res) => {
  const values = BADGE_COLUMNS.map(column => req.body[column]);
  const rows = await query(
    `INSERT INTO badges (${BADGE_COLUMNS.join(', ')})
     VALUES (${BADGE_COLUMNS.map((_, index) => `$${index + 1}`).join(', ')})
     RETURNING *`,
    values,
    'création du badge'
  );
  res.status(201).json(createResponse('Badge créé avec succès', rows[0]));
}));

// POST /check-unlock : vérifier et débloquer les badges d'un profil après une action (parent)
router.post('/check-unlock', validate(badgeCheckUnlockSchema), route('Erreur lors de la vérification des badges', async (req, res) => {
  const { profileId, actionType, actionData = {} } = req.body;
  const badgeService = require('../lib/badgeService.js');
  const unlockedBadges = await withQueryTimeout(
    badgeService.checkAndUnlockBadges(profileId, actionType, actionData),
    TIMEOUTS.DEFAULT,
    'vérification et déblocage des badges'
  );
  res.status(200).json(createResponse('Vérification des badges terminée', {
    unlockedBadges,
    count: unlockedBadges.length
  }));
}));

// Badges d'un profil : le profil doit être accessible (jeton famille : un enfant ;
// jeton profil : le sien ; parent : tous)
const profileAccess = requireProfileAccess('profileId');

// GET /profile/:profileId : tous les badges actifs avec la progression du profil
router.get('/profile/:profileId', profileAccess, route('Erreur lors de la récupération des badges du profil', async (req, res) => {
  const badges = await query(
    `SELECT
       b.*,
       COALESCE(pb.progress, 0) as progress,
       COALESCE(pb.is_unlocked, false) as is_unlocked,
       pb.unlocked_at
     FROM badges b
     LEFT JOIN profile_badges pb ON b.id = pb.badge_id AND pb.profile_id = $1
     WHERE b.is_active = true
     ORDER BY
       pb.is_unlocked DESC NULLS LAST,
       b.category,
       b.condition_value ASC`,
    [parseId(req.params.profileId)],
    'récupération des badges du profil'
  );
  res.status(200).json(createResponse('Badges du profil récupérés avec succès', badges));
}));

// GET /profile/:profileId/unlocked
router.get('/profile/:profileId/unlocked', profileAccess, route('Erreur lors de la récupération des badges débloqués', async (req, res) => {
  const badges = await query(
    `SELECT b.*, pb.unlocked_at
     FROM badges b
     INNER JOIN profile_badges pb ON b.id = pb.badge_id
     WHERE pb.profile_id = $1 AND pb.is_unlocked = true
     ORDER BY pb.unlocked_at DESC`,
    [parseId(req.params.profileId)],
    'récupération des badges débloqués'
  );
  res.status(200).json(createResponse('Badges débloqués récupérés avec succès', badges));
}));

// GET /profile/:profileId/stats
router.get('/profile/:profileId/stats', profileAccess, route('Erreur lors de la récupération des statistiques de badges', async (req, res) => {
  const rows = await query(
    `SELECT
       COUNT(DISTINCT b.id)::int as total_badges,
       COUNT(DISTINCT CASE WHEN pb.is_unlocked = true THEN b.id END)::int as unlocked_badges,
       COALESCE(SUM(CASE WHEN pb.is_unlocked = true THEN b.points ELSE 0 END), 0)::int as total_points
     FROM badges b
     LEFT JOIN profile_badges pb ON b.id = pb.badge_id AND pb.profile_id = $1
     WHERE b.is_active = true`,
    [parseId(req.params.profileId)],
    'récupération des statistiques de badges'
  );
  const total = rows[0]?.total_badges || 0;
  const unlocked = rows[0]?.unlocked_badges || 0;
  res.status(200).json(createResponse('Statistiques de badges récupérées avec succès', {
    total,
    unlocked,
    locked: total - unlocked,
    points: rows[0]?.total_points || 0,
    percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0
  }));
}));

// GET /profile/:profileId/recent?limit=1..50
router.get('/profile/:profileId/recent', profileAccess, validate(recentBadgesQuerySchema, 'query'), route('Erreur lors de la récupération des badges récents', async (req, res) => {
  const badges = await query(
    `SELECT b.*, pb.unlocked_at
     FROM badges b
     INNER JOIN profile_badges pb ON b.id = pb.badge_id
     WHERE pb.profile_id = $1 AND pb.is_unlocked = true
     ORDER BY pb.unlocked_at DESC
     LIMIT $2`,
    [parseId(req.params.profileId), req.query.limit],
    'récupération des badges récents'
  );
  res.status(200).json(createResponse('Badges récents récupérés avec succès', badges));
}));

// GET /:id
router.get('/:id', route('Erreur lors de la récupération du badge', async (req, res) => {
  const id = badgeIdOrReply(req, res);
  if (!id) return;
  const badges = await query('SELECT * FROM badges WHERE id = $1', [id], 'récupération du badge');
  if (!badges[0]) return sendFailure(res, 404, 'Badge non trouvé', 'NOT_FOUND');
  res.status(200).json(createResponse('Badge récupéré avec succès', badges[0]));
}));

// PUT /:id : mise à jour partielle (parent)
router.put('/:id', validate(badgeUpdateSchema), route('Erreur lors de la mise à jour du badge', async (req, res) => {
  const id = badgeIdOrReply(req, res);
  if (!id) return;
  const entries = BADGE_COLUMNS.filter(column => req.body[column] !== undefined);
  const params = entries.map(column => req.body[column]);
  params.push(id);
  const rows = await query(
    `UPDATE badges SET ${entries.map((column, index) => `${column} = $${index + 1}`).join(', ')}, updated_at = NOW()
     WHERE id = $${params.length}
     RETURNING *`,
    params,
    'mise à jour du badge'
  );
  if (!rows[0]) return sendFailure(res, 404, 'Badge non trouvé', 'NOT_FOUND');
  res.status(200).json(createResponse('Badge mis à jour avec succès', rows[0]));
}));

// DELETE /:id (parent)
router.delete('/:id', route('Erreur lors de la suppression du badge', async (req, res) => {
  const id = badgeIdOrReply(req, res);
  if (!id) return;
  const rows = await query('DELETE FROM badges WHERE id = $1 RETURNING id', [id], 'suppression du badge');
  if (!rows[0]) return sendFailure(res, 404, 'Badge non trouvé', 'NOT_FOUND');
  res.status(200).json(createResponse('Badge supprimé avec succès', { id }));
}));

module.exports = router;
