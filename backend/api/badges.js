const { sql } = require('../lib/database.js');
const { authenticateToken, authenticateUser } = require('../lib/auth.js');
const { runCors } = require('../lib/cors.js');
const { createResponse, createErrorResponse } = require('../lib/response.js');

/**
 * Helper pour ajouter un timeout aux requêtes SQL
 */
function withQueryTimeout(queryPromise, timeoutMs = 7000, operationName = 'requête') {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${operationName} a pris plus de ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Gestionnaire pour les badges
 */
module.exports = async function handler(req, res) {
  // Gestion CORS
  await runCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Authentification requise pour toutes les routes badges
    // Logs de débogage pour diagnostiquer les problèmes d'authentification
    const authHeader = req.headers.authorization;
    console.log('🔐 Debug authentification badges:');
    // Utiliser req.path fourni par Express (relatif au point de montage /api/badges)
    const pathname = req.path;
    const method = req.method;

    console.log(`🔍 Debug Badges - Path: ${pathname}, Method: ${method}, BaseUrl: ${req.baseUrl}`);

    // Routes des badges (racine /api/badges)
    if ((pathname === '/' || pathname === '') && method === 'GET') {
      return await handleGetAllBadges(req, res);
    }

    if ((pathname === '/' || pathname === '') && method === 'POST') {
      return await handleCreateBadge(req, res);
    }

    // Routes spécifiques pour les badges de profil (AVANT les routes génériques)
    // /api/badges/profile/:id -> /profile/:id
    if (pathname.startsWith('/profile/') && method === 'GET') {
      // Extraire le profileId et le sous-chemin
      const pathParts = pathname.split('/');
      // pathParts[0] est vide, pathParts[1] est 'profile', pathParts[2] est l'ID
      const profileId = pathParts[2];
      const subPath = pathParts[3]; // unlocked, stats, recent, ou undefined

      // Vérifier que profileId existe
      if (!profileId) {
        return res.status(400).json(createErrorResponse('ID de profil requis'));
      }

      if (subPath === 'unlocked') {
        return await handleGetUnlockedBadges(req, res, profileId);
      } else if (subPath === 'stats') {
        return await handleGetBadgeStats(req, res, profileId);
      } else if (subPath === 'recent') {
        return await handleGetRecentlyUnlockedBadges(req, res, profileId);
      } else if (!subPath) {
        // Route principale: /profile/:profileId
        return await handleGetProfileBadges(req, res, profileId);
      } else {
        // Sous-chemin non reconnu
        return res.status(404).json(createErrorResponse('Endpoint non trouvé'));
      }
    }

    // Route pour vérifier et débloquer les badges
    if (pathname === '/check-unlock' && method === 'POST') {
      return await handleCheckAndUnlockBadges(req, res);
    }

    // Routes génériques pour un badge spécifique (APRÈS les routes profile)
    // /api/badges/:id -> /:id (mais attention, /profile est déjà géré)
    // On vérifie que ce n'est pas une des routes spéciales
    if (method === 'GET' && !pathname.startsWith('/profile/') && !pathname.startsWith('/check-unlock')) {
      // C'est probablement un ID
      return await handleGetBadge(req, res);
    }

    if (method === 'PUT' && !pathname.startsWith('/profile/') && !pathname.startsWith('/check-unlock')) {
      return await handleUpdateBadge(req, res);
    }

    if (method === 'DELETE' && !pathname.startsWith('/profile/') && !pathname.startsWith('/check-unlock')) {
      return await handleDeleteBadge(req, res);
    }

    // Route non trouvée
    return res.status(404).json(createErrorResponse(`Endpoint non trouvé: ${pathname}`));

  } catch (error) {
    console.error('Erreur dans le gestionnaire badges:', error);
    return res.status(500).json(createErrorResponse('Erreur serveur interne: ' + error.message, { stack: error.stack }));
  }
}

/**
 * Récupérer tous les badges
 */
async function handleGetAllBadges(req, res) {
  try {
    // Pas de paramètres, mais on utilise withQueryTimeout pour cohérence
    const queryText = 'SELECT * FROM badges ORDER BY category, condition_value ASC';
    const query = sql(queryText);

    const badges = await withQueryTimeout(
      query,
      5000,
      'récupération de tous les badges'
    );

    return res.status(200).json(createResponse('Badges récupérés avec succès', badges));
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des badges:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la récupération des badges'));
  }
}

/**
 * Créer un nouveau badge
 */
async function handleCreateBadge(req, res) {
  try {
    const { name, description, icon, category, condition_type, condition_value, points, color, is_active = true } = req.body;

    // Validation des données requises
    if (!name || !description || !icon || !category || !condition_type || !condition_value || !points || !color) {
      return res.status(400).json(createErrorResponse('Tous les champs sont requis'));
    }

    // Validation des valeurs
    if (condition_value < 1) {
      return res.status(400).json(createErrorResponse('La valeur de condition doit être positive'));
    }

    if (points < 0) {
      return res.status(400).json(createErrorResponse('Les points doivent être positifs ou nuls'));
    }

    // Construire la requête INSERT manuellement pour garantir l'injection correcte des paramètres
    const insertQueryText = 'INSERT INTO badges (name, description, icon, category, condition_type, condition_value, points, color, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *';
    const insertQueryParams = [name, description, icon, category, condition_type, condition_value, points, color, is_active];

    console.log(`🔧 Requête INSERT construite manuellement:`);
    console.log(`   Text: ${insertQueryText}`);
    console.log(`   Params: ${JSON.stringify(insertQueryParams)}`);

    const insertQuery = sql(insertQueryText, insertQueryParams);

    console.log(`📝 Requête SQL générée:`);
    console.log(`   Text: ${insertQuery.text}`);
    console.log(`   Params: ${JSON.stringify(insertQuery.params)}`);
    console.log(`   Nombre de paramètres: ${insertQuery.params?.length || 0}`);

    const result = await withQueryTimeout(
      insertQuery,
      5000,
      'création du badge'
    );

    return res.status(201).json(createResponse('Badge créé avec succès', result[0]));
  } catch (error) {
    console.error('❌ Erreur lors de la création du badge:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la création du badge'));
  }
}

/**
 * Récupérer un badge par ID
 */
async function handleGetBadge(req, res) {
  try {
    // req.path est /:id (ex: /123)
    const badgeId = req.path.split('/')[1];

    // Validation et conversion de l'ID
    const badgeIdNum = parseInt(badgeId, 10);
    console.log(`🔍 Debug - badgeId original: "${badgeId}" (type: ${typeof badgeId})`);
    console.log(`🔍 Debug - badgeIdNum après parseInt: ${badgeIdNum} (type: ${typeof badgeIdNum}, isNaN: ${isNaN(badgeIdNum)})`);

    if (!badgeId || isNaN(badgeIdNum)) {
      return res.status(400).json(createErrorResponse('ID de badge invalide'));
    }

    // Construire la requête manuellement pour garantir l'injection correcte des paramètres
    const queryText = 'SELECT * FROM badges WHERE id = $1';
    const queryParams = [badgeIdNum];

    console.log(`🔧 Requête construite manuellement:`);
    console.log(`   Text: ${queryText}`);
    console.log(`   Params: ${JSON.stringify(queryParams)}`);

    const query = sql(queryText, queryParams);

    console.log(`📝 Requête SQL générée:`);
    console.log(`   Text: ${query.text}`);
    console.log(`   Params: ${JSON.stringify(query.params)}`);
    console.log(`   Nombre de paramètres: ${query.params?.length || 0}`);

    const badges = await withQueryTimeout(
      query,
      5000,
      'récupération du badge'
    );

    if (badges.length === 0) {
      return res.status(404).json(createErrorResponse('Badge non trouvé'));
    }

    return res.status(200).json(createResponse('Badge récupéré avec succès', badges[0]));
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du badge:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la récupération du badge'));
  }
}

/**
 * Mettre à jour un badge
 */
async function handleUpdateBadge(req, res) {
  try {
    // req.path est /:id (ex: /123)
    const badgeId = req.path.split('/')[1];

    // Validation et conversion de l'ID
    const badgeIdNum = parseInt(badgeId, 10);
    console.log(`🔍 Debug - badgeId original: "${badgeId}" (type: ${typeof badgeId})`);
    console.log(`🔍 Debug - badgeIdNum après parseInt: ${badgeIdNum} (type: ${typeof badgeIdNum}, isNaN: ${isNaN(badgeIdNum)})`);

    if (!badgeId || isNaN(badgeIdNum)) {
      return res.status(400).json(createErrorResponse('ID de badge invalide'));
    }

    const { name, description, icon, category, condition_type, condition_value, points, color, is_active } = req.body;

    // Vérifier que le badge existe avec requête manuelle
    const checkQueryText = 'SELECT * FROM badges WHERE id = $1';
    const checkQueryParams = [badgeIdNum];
    const checkQuery = sql(checkQueryText, checkQueryParams);

    const existingBadges = await withQueryTimeout(
      checkQuery,
      5000,
      'vérification du badge'
    );

    if (existingBadges.length === 0) {
      return res.status(404).json(createErrorResponse('Badge non trouvé'));
    }

    // Validation des données si fournies
    if (condition_value !== undefined && condition_value < 1) {
      return res.status(400).json(createErrorResponse('La valeur de condition doit être positive'));
    }

    if (points !== undefined && points < 0) {
      return res.status(400).json(createErrorResponse('Les points doivent être positifs ou nuls'));
    }

    // Construire la requête UPDATE manuellement
    // Note: COALESCE avec paramètres nécessite une construction spéciale
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateParams.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateParams.push(description);
    }
    if (icon !== undefined) {
      updateFields.push(`icon = $${paramIndex++}`);
      updateParams.push(icon);
    }
    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      updateParams.push(category);
    }
    if (condition_type !== undefined) {
      updateFields.push(`condition_type = $${paramIndex++}`);
      updateParams.push(condition_type);
    }
    if (condition_value !== undefined) {
      updateFields.push(`condition_value = $${paramIndex++}`);
      updateParams.push(condition_value);
    }
    if (points !== undefined) {
      updateFields.push(`points = $${paramIndex++}`);
      updateParams.push(points);
    }
    if (color !== undefined) {
      updateFields.push(`color = $${paramIndex++}`);
      updateParams.push(color);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateParams.push(is_active);
    }

    // Toujours mettre à jour updated_at
    updateFields.push('updated_at = NOW()');

    // Ajouter l'ID à la fin pour la clause WHERE
    updateParams.push(badgeIdNum);

    const updateQueryText = `UPDATE badges SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    console.log(`🔧 Requête UPDATE construite manuellement:`);
    console.log(`   Text: ${updateQueryText}`);
    console.log(`   Params: ${JSON.stringify(updateParams)}`);

    const updateQuery = sql(updateQueryText, updateParams);

    console.log(`📝 Requête SQL générée:`);
    console.log(`   Text: ${updateQuery.text}`);
    console.log(`   Params: ${JSON.stringify(updateQuery.params)}`);

    const result = await withQueryTimeout(
      updateQuery,
      5000,
      'mise à jour du badge'
    );

    return res.status(200).json(createResponse('Badge mis à jour avec succès', result[0]));
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du badge:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la mise à jour du badge'));
  }
}

/**
 * Supprimer un badge
 */
async function handleDeleteBadge(req, res) {
  try {
    // req.path est /:id (ex: /123)
    const badgeId = req.path.split('/')[1];

    // Validation et conversion de l'ID
    const badgeIdNum = parseInt(badgeId, 10);
    console.log(`🔍 Debug - badgeId original: "${badgeId}" (type: ${typeof badgeId})`);
    console.log(`🔍 Debug - badgeIdNum après parseInt: ${badgeIdNum} (type: ${typeof badgeIdNum}, isNaN: ${isNaN(badgeIdNum)})`);

    if (!badgeId || isNaN(badgeIdNum)) {
      return res.status(400).json(createErrorResponse('ID de badge invalide'));
    }

    // Vérifier que le badge existe avec requête manuelle
    const checkQueryText = 'SELECT * FROM badges WHERE id = $1';
    const checkQueryParams = [badgeIdNum];
    const checkQuery = sql(checkQueryText, checkQueryParams);

    console.log(`🔧 Requête de vérification construite manuellement:`);
    console.log(`   Text: ${checkQueryText}`);
    console.log(`   Params: ${JSON.stringify(checkQueryParams)}`);

    const existingBadges = await withQueryTimeout(
      checkQuery,
      5000,
      'vérification du badge'
    );

    if (existingBadges.length === 0) {
      return res.status(404).json(createErrorResponse('Badge non trouvé'));
    }

    // Supprimer le badge avec requête manuelle
    const deleteQueryText = 'DELETE FROM badges WHERE id = $1';
    const deleteQueryParams = [badgeIdNum];
    const deleteQuery = sql(deleteQueryText, deleteQueryParams);

    console.log(`🔧 Requête DELETE construite manuellement:`);
    console.log(`   Text: ${deleteQueryText}`);
    console.log(`   Params: ${JSON.stringify(deleteQueryParams)}`);

    await withQueryTimeout(
      deleteQuery,
      5000,
      'suppression du badge'
    );

    return res.status(200).json(createResponse('Badge supprimé avec succès'));
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du badge:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la suppression du badge'));
  }
}

/**
 * Récupérer tous les badges d'un profil avec leur progression
 */
async function handleGetProfileBadges(req, res, profileId) {
  try {
    // Validation et conversion de l'ID
    const profileIdNum = parseInt(profileId, 10);

    if (!profileId || isNaN(profileIdNum)) {
      return res.status(400).json(createErrorResponse('ID de profil invalide'));
    }

    // Requête SQL pour récupérer les badges avec progression
    const queryText = `
      SELECT 
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
        b.condition_value ASC
    `;
    const queryParams = [profileIdNum];
    const query = sql(queryText, queryParams);

    const badges = await withQueryTimeout(
      query,
      5000,
      'récupération des badges du profil'
    );

    return res.status(200).json(createResponse('Badges du profil récupérés avec succès', badges));
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des badges du profil:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la récupération des badges du profil'));
  }
}

/**
 * Récupérer les badges débloqués d'un profil
 */
async function handleGetUnlockedBadges(req, res, profileId) {
  try {
    // Validation et conversion de l'ID
    const profileIdNum = parseInt(profileId, 10);

    if (!profileId || isNaN(profileIdNum)) {
      return res.status(400).json(createErrorResponse('ID de profil invalide'));
    }

    // Requête SQL pour récupérer les badges débloqués
    const queryText = `
      SELECT b.*, pb.unlocked_at
      FROM badges b
      INNER JOIN profile_badges pb ON b.id = pb.badge_id
      WHERE pb.profile_id = $1 AND pb.is_unlocked = true
      ORDER BY pb.unlocked_at DESC
    `;
    const queryParams = [profileIdNum];
    const query = sql(queryText, queryParams);

    const badges = await withQueryTimeout(
      query,
      5000,
      'récupération des badges débloqués'
    );

    return res.status(200).json(createResponse('Badges débloqués récupérés avec succès', badges));
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des badges débloqués:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la récupération des badges débloqués'));
  }
}

/**
 * Récupérer les statistiques de badges d'un profil
 */
async function handleGetBadgeStats(req, res, profileId) {
  try {
    // Validation et conversion de l'ID
    const profileIdNum = parseInt(profileId, 10);

    if (!profileId || isNaN(profileIdNum)) {
      return res.status(400).json(createErrorResponse('ID de profil invalide'));
    }

    // Requête SQL pour récupérer les statistiques
    const queryText = `
      SELECT 
        COUNT(DISTINCT b.id) as total_badges,
        COUNT(DISTINCT CASE WHEN pb.is_unlocked = true THEN b.id END) as unlocked_badges,
        COALESCE(SUM(CASE WHEN pb.is_unlocked = true THEN b.points ELSE 0 END), 0) as total_points
      FROM badges b
      LEFT JOIN profile_badges pb ON b.id = pb.badge_id AND pb.profile_id = $1
      WHERE b.is_active = true
    `;
    const queryParams = [profileIdNum];
    const query = sql(queryText, queryParams);

    const result = await withQueryTimeout(
      query,
      5000,
      'récupération des statistiques de badges'
    );

    const stats = result[0];
    const total = parseInt(stats.total_badges) || 0;
    const unlocked = parseInt(stats.unlocked_badges) || 0;
    const locked = total - unlocked;
    const points = parseInt(stats.total_points) || 0;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    const statsData = {
      total,
      unlocked,
      locked,
      points,
      percentage
    };

    return res.status(200).json(createResponse('Statistiques de badges récupérées avec succès', statsData));
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques de badges:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la récupération des statistiques de badges'));
  }
}

/**
 * Récupérer les badges récemment débloqués d'un profil
 */
async function handleGetRecentlyUnlockedBadges(req, res, profileId) {
  try {
    // Validation et conversion de l'ID
    const profileIdNum = parseInt(profileId, 10);

    if (!profileId || isNaN(profileIdNum)) {
      return res.status(400).json(createErrorResponse('ID de profil invalide'));
    }

    // Récupérer le paramètre limit depuis la query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit') || '5', 10);

    // Requête SQL pour récupérer les badges récents
    const queryText = `
      SELECT b.*, pb.unlocked_at
      FROM badges b
      INNER JOIN profile_badges pb ON b.id = pb.badge_id
      WHERE pb.profile_id = $1 AND pb.is_unlocked = true
      ORDER BY pb.unlocked_at DESC
      LIMIT $2
    `;
    const queryParams = [profileIdNum, limit];
    const query = sql(queryText, queryParams);

    const badges = await withQueryTimeout(
      query,
      5000,
      'récupération des badges récents'
    );

    return res.status(200).json(createResponse('Badges récents récupérés avec succès', badges));
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des badges récents:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la récupération des badges récents'));
  }
}

/**
 * Vérifier et débloquer automatiquement les badges après une action
 */
async function handleCheckAndUnlockBadges(req, res) {
  try {
    const { profileId, actionType, actionData = {} } = req.body;

    if (!profileId || !actionType) {
      return res.status(400).json(createErrorResponse('profileId et actionType sont requis'));
    }

    const profileIdNum = parseInt(profileId, 10);
    if (isNaN(profileIdNum)) {
      return res.status(400).json(createErrorResponse('ID de profil invalide'));
    }

    console.log(`🎯 Vérification des badges - profileId: ${profileIdNum}, actionType: ${actionType}`);

    // Importer le service de badges
    const badgeService = require('../lib/badgeService.js');

    // Vérifier et débloquer les badges
    const unlockedBadges = await withQueryTimeout(
      badgeService.checkAndUnlockBadges(profileIdNum, actionType, actionData),
      7000,
      'vérification et déblocage des badges'
    );

    return res.status(200).json(createResponse('Vérification des badges terminée', {
      unlockedBadges,
      count: unlockedBadges.length
    }));
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des badges:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).json(createErrorResponse('Erreur lors de la vérification des badges'));
  }
}

