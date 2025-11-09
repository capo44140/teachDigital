const { sql } = require('../lib/database.js');
const { authenticateToken } = require('../lib/auth.js');
const { setCorsHeaders, handleCors } = require('../lib/cors.js');
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
    const url = new URL(req.url, `http://${req.headers.host}`);
    const badgeId = url.pathname.split('/')[3];

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
    const url = new URL(req.url, `http://${req.headers.host}`);
    const badgeId = url.pathname.split('/')[3];

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
    const url = new URL(req.url, `http://${req.headers.host}`);
    const badgeId = url.pathname.split('/')[3];

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
