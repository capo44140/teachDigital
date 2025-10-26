const { sql } = require('../lib/database.js');
const { authenticateToken } = require('../lib/auth.js');
const { setCorsHeaders, handleCors } = require('../lib/cors.js');
const { createResponse, createErrorResponse } = require('../lib/response.js');

/**
 * Gestionnaire pour les badges
 */
module.exports = async function handler(req, res) {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req, res);
  }

  setCorsHeaders(res);

  try {
    // Authentification requise pour toutes les routes badges
    const authResult = authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json(createErrorResponse('Token d\'authentification invalide'));
    }

    const { method } = req;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Routes des badges
    if (pathname === '/api/badges' && method === 'GET') {
      return await handleGetAllBadges(req, res);
    }
    
    if (pathname === '/api/badges' && method === 'POST') {
      return await handleCreateBadge(req, res);
    }
    
    if (pathname.startsWith('/api/badges/') && method === 'GET') {
      return await handleGetBadge(req, res);
    }
    
    if (pathname.startsWith('/api/badges/') && method === 'PUT') {
      return await handleUpdateBadge(req, res);
    }
    
    if (pathname.startsWith('/api/badges/') && method === 'DELETE') {
      return await handleDeleteBadge(req, res);
    }

    // Route non trouvée
    return res.status(404).json(createErrorResponse('Endpoint non trouvé'));

  } catch (error) {
    console.error('Erreur dans le gestionnaire badges:', error);
    return res.status(500).json(createErrorResponse('Erreur serveur interne'));
  }
}

/**
 * Récupérer tous les badges
 */
async function handleGetAllBadges(req, res) {
  try {
    const badges = await sql`
      SELECT * FROM badges 
      ORDER BY category, condition_value ASC
    `;
    
    return res.status(200).json(createResponse('Badges récupérés avec succès', badges));
  } catch (error) {
    console.error('Erreur lors de la récupération des badges:', error);
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

    const result = await sql`
      INSERT INTO badges (name, description, icon, category, condition_type, condition_value, points, color, is_active)
      VALUES (${name}, ${description}, ${icon}, ${category}, ${condition_type}, ${condition_value}, ${points}, ${color}, ${is_active})
      RETURNING *
    `;

    return res.status(201).json(createResponse('Badge créé avec succès', result[0]));
  } catch (error) {
    console.error('Erreur lors de la création du badge:', error);
    return res.status(500).json(createErrorResponse('Erreur lors de la création du badge'));
  }
}

/**
 * Récupérer un badge par ID
 */
async function handleGetBadge(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const badgeId = url.pathname.split('/')[3];

    if (!badgeId || isNaN(badgeId)) {
      return res.status(400).json(createErrorResponse('ID de badge invalide'));
    }

    const badges = await sql`
      SELECT * FROM badges WHERE id = ${badgeId}
    `;

    if (badges.length === 0) {
      return res.status(404).json(createErrorResponse('Badge non trouvé'));
    }

    return res.status(200).json(createResponse('Badge récupéré avec succès', badges[0]));
  } catch (error) {
    console.error('Erreur lors de la récupération du badge:', error);
    return res.status(500).json(createErrorResponse('Erreur lors de la récupération du badge'));
  }
}

/**
 * Mettre à jour un badge
 */
async function handleUpdateBadge(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const badgeId = url.pathname.split('/')[3];

    if (!badgeId || isNaN(badgeId)) {
      return res.status(400).json(createErrorResponse('ID de badge invalide'));
    }

    const { name, description, icon, category, condition_type, condition_value, points, color, is_active } = req.body;

    // Vérifier que le badge existe
    const existingBadges = await sql`
      SELECT * FROM badges WHERE id = ${badgeId}
    `;

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

    const result = await sql`
      UPDATE badges 
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        icon = COALESCE(${icon}, icon),
        category = COALESCE(${category}, category),
        condition_type = COALESCE(${condition_type}, condition_type),
        condition_value = COALESCE(${condition_value}, condition_value),
        points = COALESCE(${points}, points),
        color = COALESCE(${color}, color),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = NOW()
      WHERE id = ${badgeId}
      RETURNING *
    `;

    return res.status(200).json(createResponse('Badge mis à jour avec succès', result[0]));
  } catch (error) {
    console.error('Erreur lors de la mise à jour du badge:', error);
    return res.status(500).json(createErrorResponse('Erreur lors de la mise à jour du badge'));
  }
}

/**
 * Supprimer un badge
 */
async function handleDeleteBadge(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const badgeId = url.pathname.split('/')[3];

    if (!badgeId || isNaN(badgeId)) {
      return res.status(400).json(createErrorResponse('ID de badge invalide'));
    }

    // Vérifier que le badge existe
    const existingBadges = await sql`
      SELECT * FROM badges WHERE id = ${badgeId}
    `;

    if (existingBadges.length === 0) {
      return res.status(404).json(createErrorResponse('Badge non trouvé'));
    }

    // Supprimer le badge
    await sql`
      DELETE FROM badges WHERE id = ${badgeId}
    `;

    return res.status(200).json(createResponse('Badge supprimé avec succès'));
  } catch (error) {
    console.error('Erreur lors de la suppression du badge:', error);
    return res.status(500).json(createErrorResponse('Erreur lors de la suppression du badge'));
  }
}
