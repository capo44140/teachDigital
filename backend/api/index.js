// Import des dépendances
const { NativeHashService } = require('../lib/nativeHash.js');
const { default: sql, executeWithRetry } = require('../lib/database.js');
const { generateToken, createSession, authenticateToken, deleteSession } = require('../lib/auth.js');
const { handleError } = require('../lib/response.js');
const handleBadges = require('./badges.js');
const handleAI = require('./ai.js');

// Helper pour ajouter un timeout sur les requêtes SQL (évite les timeouts Vercel)
// Timeout par défaut: 7s (sûr pour plans gratuits Vercel 10s)
function withQueryTimeout(queryPromise, timeoutMs = 7000, operationName = 'requête') {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout ${operationName} après ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

module.exports = async function handler(req, res) {

  // Configuration CORS complète - DOIT être définie en premier
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://teach-digital.vercel.app',
    'https://teachdigital.vercel.app'
  ];
  
  // Vérifier si l'origine est autorisée
  // En développement, accepter localhost avec n'importe quel port
  const isLocalhost = origin && origin.startsWith('http://localhost');
  const isAllowedOrigin = origin && (allowedOrigins.includes(origin) || isLocalhost);
  
  // Définir l'origine CORS : utiliser l'origine si elle est autorisée, sinon '*'
  const corsOrigin = (origin && isAllowedOrigin) ? origin : '*';
  
  // Définir tous les en-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  // Ne pas utiliser credentials si on utilise '*' (incompatible avec CORS)
  if (corsOrigin !== '*') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Gérer les requêtes OPTIONS (preflight) - DOIT être géré avant tout autre traitement
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Router simple basé sur l'URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // Routes d'authentification
    if (pathname === '/api/auth/login') {
      return await handleLogin(req, res);
    }
    if (pathname === '/api/auth/logout') {
      return await handleLogout(req, res);
    }

    // Routes des profils
    if (pathname === '/api/profiles' && !pathname.includes('/api/profiles/')) {
      return await handleProfiles(req, res);
    }
    
    // Routes des statistiques des profils (AVANT la route générique /api/profiles/:id)
    if (pathname === '/api/profiles/stats') {
      return await handleProfileStats(req, res);
    }
    
    // Routes des codes PIN (AVANT la route générique /api/profiles/:id)
    if (pathname.startsWith('/api/profiles/') && pathname.includes('/pin')) {
      return await handlePin(req, res);
    }
    
    // Route générique pour un profil spécifique
    if (pathname.startsWith('/api/profiles/')) {
      return await handleProfile(req, res);
    }

    // Routes des leçons
    if (pathname === '/api/lessons' && !pathname.includes('/api/lessons/')) {
      return await handleLessons(req, res);
    }
    if (pathname.startsWith('/api/lessons/')) {
      return await handleLesson(req, res);
    }

    // Routes des notifications
    if (pathname === '/api/notifications' && !pathname.includes('/api/notifications/')) {
      return await handleNotifications(req, res);
    }
    if (pathname.startsWith('/api/notifications/')) {
      return await handleNotification(req, res);
    }

    // Routes des activités
    if (pathname === '/api/activities') {
      return await handleActivities(req, res);
    }

    // Routes des vidéos YouTube
    if (pathname === '/api/youtube-videos') {
      return await handleYoutubeVideos(req, res);
    }

    // Routes des badges
    if (pathname.startsWith('/api/badges')) {
      return await handleBadges(req, res);
    }

    // Routes IA
    if (pathname.startsWith('/api/ai')) {
      return await handleAI(req, res);
    }

    // Route d'initialisation des pins
    if (pathname === '/api/init-pins') {
      return await handleInitPins(req, res);
    }

    // Routes des logs d'audit
    if (pathname.startsWith('/api/audit')) {
      return await handleAudit(req, res);
    }

    // Route non trouvée
    res.status(404).json({ 
      success: false, 
      message: 'Route non trouvée' 
    });

  } catch (error) {
    console.error('Erreur dans le routeur principal:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
}

// Handler de connexion
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const { profileId, pin } = req.body;

    if (!profileId || !pin) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de profil et code PIN requis' 
      });
      return;
    }

    const [profile, pinData] = await Promise.all([
      withQueryTimeout(sql`SELECT * FROM profiles WHERE id = ${profileId} AND is_active = true`, 5000, 'récupération du profil'),
      withQueryTimeout(sql`SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1`, 5000, 'récupération du PIN')
    ]);

    if (!profile[0] || !pinData[0]) {
      res.status(401).json({ 
        success: false, 
        message: 'Profil ou code PIN invalide' 
      });
      return;
    }

    const isValidPin = await NativeHashService.verifyPin(pin, pinData[0].pin_code);
    if (!isValidPin) {
      res.status(401).json({ 
        success: false, 
        message: 'Code PIN incorrect' 
      });
      return;
    }

    const tokenPayload = {
      profileId: profile[0].id,
      name: profile[0].name,
      type: profile[0].type,
      isAdmin: profile[0].is_admin
    };
    
    const token = generateToken(tokenPayload);
    const sessionToken = generateToken({ profileId: profile[0].id });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await createSession(profile[0].id, sessionToken, expiresAt);

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        profile: {
          id: profile[0].id,
          name: profile[0].name,
          type: profile[0].type,
          isAdmin: profile[0].is_admin,
          isChild: profile[0].is_child,
          isTeen: profile[0].is_teen
        }
      }
    });

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la connexion');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler de déconnexion
async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      await deleteSession(token);
    }

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la déconnexion');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler des profils
async function handleProfiles(req, res) {
  try {
    if (req.method === 'GET') {
      // GET est public - récupérer tous les profils
      // Requête optimisée sans retry pour éviter les timeouts
      // Exclure image_data pour améliorer les performances
      const startTime = Date.now();
      
      try {
        // Timeout explicite sur la requête pour éviter les blocages
        const profiles = await withQueryTimeout(
          sql`
            SELECT 
              id, name, description, type, is_admin, is_child, is_teen, 
              is_active, is_locked, color, avatar_class, avatar_content, 
              image_url, image_type, level, created_at, updated_at
            FROM profiles 
            ORDER BY created_at DESC
          `,
          7000,
          'récupération des profils'
        );
        
        const duration = Date.now() - startTime;
        console.log(`✅ Profils récupérés: ${profiles.length} en ${duration}ms`);

        res.status(200).json({
          success: true,
          message: 'Profils récupérés avec succès',
          data: { profiles }
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Erreur récupération profils après ${duration}ms:`, error.message);
        throw error;
      }

    } else if (req.method === 'POST') {
      // POST requiert l'authentification
      const user = authenticateToken(req);
      
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const { name, description, type, color, avatar_class, avatar_content, level } = req.body;

      if (!name || !type) {
        res.status(400).json({ 
          success: false, 
          message: 'Nom et type requis' 
        });
        return;
      }

      const is_admin = type === 'admin';
      const is_child = type === 'child';
      const is_teen = type === 'teen';

      const result = await withQueryTimeout(
        sql`
          INSERT INTO profiles (
            name, description, type, color, avatar_class, avatar_content, 
            level, is_admin, is_child, is_teen, is_active
          )
          VALUES (
            ${name}, ${description}, ${type}, ${color || 'purple'}, 
            ${avatar_class}, ${avatar_content}, ${level}, 
            ${is_admin}, ${is_child}, ${is_teen}, true
          )
          RETURNING *
        `,
        5000,
        'création du profil'
      );

      res.status(201).json({
        success: true,
        message: 'Profil créé avec succès',
        data: { profile: result[0] }
      });
    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    // Gestion spéciale des timeouts
    if (error.message?.includes('timeout') || error.message?.includes('Query timeout')) {
      console.error('⏱️ Timeout lors de la récupération des profils:', error.message);
      res.status(504).json({
        success: false,
        message: 'Timeout: La requête a pris trop de temps. Veuillez réessayer.',
        error: 'GATEWAY_TIMEOUT'
      });
      return;
    }
    const errorResponse = handleError(error, 'Erreur lors de la gestion des profils');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler d'un profil spécifique
async function handleProfile(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // Extraire l'ID du profil avec une regex (/api/profiles/123 ou /api/profiles/123/pin)
    const idMatch = pathname.match(/\/api\/profiles\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    if (!id) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de profil requis' 
      });
      return;
    }

    // Déterminer si c'est une route imbriquée (ex: /api/profiles/1/pin)
    const isNestedRoute = pathname.includes(`/api/profiles/${id}/`);
    const nestedMatch = pathname.match(new RegExp(`/api/profiles/${id}/([a-z-]+)`));
    const nestedPath = nestedMatch ? nestedMatch[1] : null;

    // Gérer les routes imbriquées
    if (nestedPath === 'pin') {
      return await handleProfilePin(req, res, id);
    }

    // Gérer les routes standard du profil
    if (req.method === 'GET') {
      console.log(`🔍 Récupération du profil ID: ${id} (type: ${typeof id})`);
      
      try {
        const profiles = await withQueryTimeout(
          sql`
            SELECT 
              id, name, description, type, is_admin, is_child, is_teen, 
              is_active, is_locked, color, avatar_class, avatar_content, 
              image_url, image_data, image_type, level, created_at, updated_at
            FROM profiles 
            WHERE id = ${parseInt(id)}
          `,
          5000,
          'récupération du profil'
        );

        console.log(`✅ Profil récupéré: ${profiles.length} résultat(s)`);

        if (!profiles[0]) {
          res.status(404).json({ 
            success: false, 
            message: 'Profil non trouvé' 
          });
          return;
        }

        res.status(200).json({
          success: true,
          message: 'Profil récupéré avec succès',
          data: { profile: profiles[0] }
        });
      } catch (sqlError) {
        console.error('❌ Erreur SQL lors de la récupération du profil:', {
          message: sqlError.message,
          code: sqlError.code,
          detail: sqlError.detail,
          hint: sqlError.hint,
          id: id
        });
        throw sqlError;
      }

    } else if (req.method === 'PUT') {
      // Authentification requise pour PUT
      const user = authenticateToken(req);
      
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const { name, description, type, color, avatar_class, avatar_content, level, is_active } = req.body;

      const result = await withQueryTimeout(
        sql`
          UPDATE profiles 
          SET 
            name = COALESCE(${name}, name),
            description = COALESCE(${description}, description),
            type = COALESCE(${type}, type),
            color = COALESCE(${color}, color),
            avatar_class = COALESCE(${avatar_class}, avatar_class),
            avatar_content = COALESCE(${avatar_content}, avatar_content),
            level = COALESCE(${level}, level),
            is_active = COALESCE(${is_active}, is_active),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING *
        `,
        5000,
        'mise à jour du profil'
      );

      if (!result[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profil modifié avec succès',
        data: { profile: result[0] }
      });

    } else if (req.method === 'DELETE') {
      // Authentification requise pour DELETE
      const user = authenticateToken(req);
      
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const result = await withQueryTimeout(
        sql`
          DELETE FROM profiles 
          WHERE id = ${id}
          RETURNING *
        `,
        5000,
        'suppression du profil'
      );

      if (!result[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profil supprimé avec succès',
        data: { profile: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    console.error('❌ Erreur dans handleProfile:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      pathname: req.url
    });
    const errorResponse = handleError(error, 'Erreur lors de la gestion du profil');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler d'un profil spécifique (route imbriquée pour le pin)
async function handleProfilePin(req, res, profileId) {
  try {
    if (req.method === 'GET') {
      // GET /api/profiles/:id/pin - Récupérer le statut du PIN (admin seulement)
      const user = authenticateToken(req);
      
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const pinData = await withQueryTimeout(
        sql`
          SELECT pin_code, created_at FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
        `,
        5000,
        'récupération du PIN'
      );

      if (!pinData[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Code PIN non trouvé pour ce profil' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Code PIN récupéré avec succès',
        data: { 
          profileId,
          created_at: pinData[0].created_at
        }
      });

    } else if (req.method === 'POST') {
      // POST /api/profiles/:id/pin - Vérifier le PIN
      const { pin } = req.body;

      if (!pin) {
        res.status(400).json({ 
          success: false, 
          message: 'Code PIN requis' 
        });
        return;
      }

      const existingPin = await withQueryTimeout(
        sql`
          SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
        `,
        5000,
        'vérification du PIN'
      );

      if (!existingPin[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Code PIN non trouvé pour ce profil' 
        });
        return;
      }

      const isValidPin = await NativeHashService.verifyPin(pin, existingPin[0].pin_code);
      if (!isValidPin) {
        res.status(401).json({ 
          success: false, 
          message: 'Code PIN incorrect' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Code PIN vérifié avec succès'
      });

    } else if (req.method === 'PUT') {
      // PUT /api/profiles/:id/pin - Mettre à jour le PIN (authentification requise)
      const user = authenticateToken(req);
      const { newPin, currentPin } = req.body;

      if (!newPin) {
        res.status(400).json({ 
          success: false, 
          message: 'Nouveau code PIN requis' 
        });
        return;
      }

      // Vérifier que le profil existe
      const profile = await withQueryTimeout(
        sql`
          SELECT id FROM profiles WHERE id = ${profileId}
        `,
        5000,
        'vérification du profil'
      );

      if (!profile[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      // Vérifier le PIN actuel si fourni (sécurité additionnelle)
      if (currentPin) {
        const existingPin = await withQueryTimeout(
          sql`
            SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
          `,
          5000,
          'vérification du PIN actuel'
        );

        if (!existingPin[0]) {
          res.status(404).json({ 
            success: false, 
            message: 'Code PIN non trouvé pour ce profil' 
          });
          return;
        }

        const isValidPin = await NativeHashService.verifyPin(currentPin, existingPin[0].pin_code);
        if (!isValidPin) {
          res.status(401).json({ 
            success: false, 
            message: 'Code PIN actuel incorrect' 
          });
          return;
        }
      }

      // Hacher le nouveau PIN
      const hashedPin = await NativeHashService.hashPin(newPin);

      // Mettre à jour ou créer le PIN
      const result = await withQueryTimeout(
        sql`
          INSERT INTO pin_codes (profile_id, pin_code)
          VALUES (${profileId}, ${hashedPin})
          RETURNING profile_id, created_at
        `,
        5000,
        'mise à jour du PIN'
      );

      res.status(200).json({
        success: true,
        message: 'Code PIN mis à jour avec succès',
        data: {
          profileId,
          created_at: result[0].created_at
        }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion du code PIN du profil');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler des leçons
async function handleLessons(req, res) {
  try {
    if (req.method === 'GET') {
      // Parser les query parameters depuis l'URL
      const url = new URL(req.url, `http://${req.headers.host}`);
      const profileId = url.searchParams.get('profileId');
      const published = url.searchParams.get('published');

      console.log(`🔍 Récupération des leçons - profileId: ${profileId}, published: ${published} (type: ${typeof published})`);
      const startTime = Date.now();

      let lessons;
      
      if (profileId && published !== null && published !== undefined) {
        // Les deux paramètres sont fournis
        // OPTIMISATION: Requête simplifiée sans JOIN pour améliorer les performances
        // Exclure image_data et quiz_data des listes (très volumineux en base64)
        const connectionStartTime = Date.now();
        console.log(`🔌 Début de la connexion à la base de données...`);
        
        // Déclarer query en dehors du try pour qu'elle soit accessible dans le catch
        let query;
        
        try {
          const queryStartTime = Date.now();
          // Validation et conversion des paramètres
          const profileIdNum = parseInt(profileId, 10);
          console.log(`🔍 Debug - profileId original: "${profileId}" (type: ${typeof profileId})`);
          console.log(`🔍 Debug - profileIdNum après parseInt: ${profileIdNum} (type: ${typeof profileIdNum}, isNaN: ${isNaN(profileIdNum)})`);
          
          if (isNaN(profileIdNum)) {
            res.status(400).json({
              success: false,
              message: 'ID de profil invalide'
            });
            return;
          }
          
          // Convertir published en booléen JavaScript (pas string)
          const isPublished = published === 'true' || published === true || published === '1';
          console.log(`📊 Paramètres - profileIdNum: ${profileIdNum} (type: ${typeof profileIdNum}), isPublished: ${isPublished} (type: ${typeof isPublished})`);
          
          // Construire la requête avec les paramètres correctement typés
          console.log(`🔧 Construction de la requête SQL avec profileIdNum=${profileIdNum} (number), isPublished=${isPublished} (boolean)`);
          
          // Construire la requête en séparant les paramètres pour éviter les problèmes d'injection
          // Utiliser une requête sur une seule ligne pour éviter les problèmes de formatage
          const queryText = 'SELECT id, title, description, subject, level, image_filename, is_published, created_at, updated_at, profile_id FROM lessons WHERE profile_id = $1 AND is_published = $2 ORDER BY created_at DESC LIMIT 100';
          const queryParams = [profileIdNum, isPublished];
          
          console.log(`🔧 Requête construite manuellement:`);
          console.log(`   Text: ${queryText}`);
          console.log(`   Params: ${JSON.stringify(queryParams)}`);
          
          // Utiliser sql() avec texte et paramètres séparés
          query = sql(queryText, queryParams);
          
          // Logger la requête SQL complète pour diagnostic
          console.log(`📝 Requête SQL générée:`);
          console.log(`   Text: ${query.text}`);
          console.log(`   Params: ${JSON.stringify(query.params)}`);
          console.log(`   Nombre de paramètres: ${query.params?.length || 0}`);
          if (query.params && query.params.length > 0) {
            console.log(`   Paramètres détaillés:`, query.params.map((p, i) => `$${i+1} = ${p} (type: ${typeof p})`).join(', '));
          } else {
            console.error(`   ⚠️  AUCUN PARAMÈTRE DÉTECTÉ - La requête ne contient pas de paramètres !`);
          }
          
          lessons = await withQueryTimeout(
            query,
            5000,
            'récupération des leçons par profil et statut'
          );
          const queryTime = Date.now() - queryStartTime;
          const connectionTime = Date.now() - connectionStartTime;
          console.log(`⏱️  Connexion établie en ${connectionTime - queryTime}ms`);
          console.log(`⏱️  Requête SQL exécutée en ${queryTime}ms`);
          console.log(`⏱️  Temps total: ${connectionTime}ms`);
        } catch (error) {
          const errorTime = Date.now() - connectionStartTime;
          console.error(`❌ Erreur après ${errorTime}ms:`, {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            position: error.position,
            stack: error.stack?.substring(0, 500)
          });
          // Logger aussi la requête qui a échoué si elle existe
          if (query && query.text) {
            console.error(`❌ Requête SQL qui a échoué:`, {
              text: query.text,
              params: query.params
            });
          } else {
            console.error(`❌ Requête SQL non disponible (erreur avant construction)`);
          }
          throw error;
        }
      } else if (profileId) {
        // Seulement profileId - Requête simplifiée sans JOIN
        const queryStartTime = Date.now();
        lessons = await withQueryTimeout(
          sql`
            SELECT 
              id, title, description, subject, level, 
              image_filename,
              is_published, created_at, updated_at,
              profile_id
            FROM lessons
            WHERE profile_id = ${parseInt(profileId)}
            ORDER BY created_at DESC
            LIMIT 100
          `,
          5000,
          'récupération des leçons par profil'
        );
        const queryTime = Date.now() - queryStartTime;
        console.log(`⏱️  Requête SQL exécutée en ${queryTime}ms`);
      } else if (published !== undefined && published !== null) {
        // Seulement published - Requête simplifiée sans JOIN
        const queryStartTime = Date.now();
        const isPublished = published === 'true' || published === true || published === '1';
        // Utiliser une requête conditionnelle pour éviter les problèmes de conversion de type
        lessons = await withQueryTimeout(
          isPublished
            ? sql`
                SELECT 
                  id, title, description, subject, level, 
                  image_filename,
                  is_published, created_at, updated_at,
                  profile_id
                FROM lessons
                WHERE is_published = true
                ORDER BY created_at DESC
                LIMIT 100
              `
            : sql`
                SELECT 
                  id, title, description, subject, level, 
                  image_filename,
                  is_published, created_at, updated_at,
                  profile_id
                FROM lessons
                WHERE is_published = false
                ORDER BY created_at DESC
                LIMIT 100
              `,
          5000,
          'récupération des leçons publiées'
        );
        const queryTime = Date.now() - queryStartTime;
        console.log(`⏱️  Requête SQL exécutée en ${queryTime}ms`);
      } else {
        // Aucun paramètre - toutes les leçons - Requête simplifiée sans JOIN
        const queryStartTime = Date.now();
        lessons = await withQueryTimeout(
          sql`
            SELECT 
              id, title, description, subject, level, 
              image_filename,
              is_published, created_at, updated_at,
              profile_id
            FROM lessons
            ORDER BY created_at DESC
            LIMIT 100
          `,
          5000,
          'récupération des leçons'
        );
        const queryTime = Date.now() - queryStartTime;
        console.log(`⏱️  Requête SQL exécutée en ${queryTime}ms`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ Leçons récupérées: ${lessons.length} résultat(s) en ${totalTime}ms`);

      res.status(200).json({
        success: true,
        message: 'Leçons récupérées avec succès',
        data: { lessons }
      });

    } else if (req.method === 'POST') {
      // Authentification requise pour POST
      const user = authenticateToken(req);
      
      const { 
        title, description, subject, level, 
        imageFilename, imageData, quizData, isPublished = true 
      } = req.body;

      console.log(`🔍 Création d'une nouvelle leçon - titre: ${title}`);

      if (!title || !quizData) {
        res.status(400).json({ 
          success: false, 
          message: 'Titre et données de quiz requis' 
        });
        return;
      }

      const result = await withQueryTimeout(
        sql`
          INSERT INTO lessons (
            profile_id, title, description, subject, level,
            image_filename, image_data, quiz_data, is_published
          )
          VALUES (
            ${user.profileId}, ${title}, ${description}, ${subject}, ${level},
            ${imageFilename}, ${imageData}, ${JSON.stringify(quizData)}, ${isPublished}
          )
          RETURNING *
        `,
        5000,
        'création de la leçon'
      );

      res.status(201).json({
        success: true,
        message: 'Leçon créée avec succès',
        data: { lesson: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    console.error('❌ Erreur dans handleLessons:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      pathname: req.url
    });
    const errorResponse = handleError(error, 'Erreur lors de la gestion des leçons');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler d'une leçon spécifique
async function handleLesson(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // Extraire l'ID de la leçon avec une regex (/api/lessons/123)
    const idMatch = pathname.match(/\/api\/lessons\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    if (!id) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de leçon requis' 
      });
      return;
    }

    if (req.method === 'GET') {
      console.log(`🔍 Récupération de la leçon ID: ${id} (type: ${typeof id})`);
      
      try {
        // Validation et conversion de l'ID
        const lessonIdNum = parseInt(id, 10);
        console.log(`🔍 Debug - id original: "${id}" (type: ${typeof id})`);
        console.log(`🔍 Debug - lessonIdNum après parseInt: ${lessonIdNum} (type: ${typeof lessonIdNum}, isNaN: ${isNaN(lessonIdNum)})`);
        
        if (isNaN(lessonIdNum)) {
          res.status(400).json({
            success: false,
            message: 'ID de leçon invalide'
          });
          return;
        }
        
        // Construire la requête manuellement pour garantir l'injection correcte des paramètres
        const queryText = 'SELECT l.id, l.title, l.description, l.subject, l.level, l.image_filename, l.image_data, l.quiz_data, l.is_published, l.created_at, l.updated_at, p.name as profile_name, p.id as profile_id FROM lessons l JOIN profiles p ON l.profile_id = p.id WHERE l.id = $1';
        const queryParams = [lessonIdNum];
        
        console.log(`🔧 Requête construite manuellement:`);
        console.log(`   Text: ${queryText}`);
        console.log(`   Params: ${JSON.stringify(queryParams)}`);
        
        const query = sql(queryText, queryParams);
        
        console.log(`📝 Requête SQL générée:`);
        console.log(`   Text: ${query.text}`);
        console.log(`   Params: ${JSON.stringify(query.params)}`);
        console.log(`   Nombre de paramètres: ${query.params?.length || 0}`);
        
        const lessons = await withQueryTimeout(
          query,
          5000,
          'récupération de la leçon'
        );

        console.log(`✅ Leçon récupérée: ${lessons.length} résultat(s)`);

        if (!lessons[0]) {
          res.status(404).json({ 
            success: false, 
            message: 'Leçon non trouvée' 
          });
          return;
        }

        res.status(200).json({
          success: true,
          message: 'Leçon récupérée avec succès',
          data: { lesson: lessons[0] }
        });
      } catch (sqlError) {
        console.error('❌ Erreur SQL lors de la récupération de la leçon:', {
          message: sqlError.message,
          code: sqlError.code,
          detail: sqlError.detail,
          hint: sqlError.hint,
          id: id
        });
        throw sqlError;
      }

    } else if (req.method === 'PUT') {
      // Authentification requise pour PUT
      const user = authenticateToken(req);
      
      const { 
        title, description, subject, level, 
        imageFilename, imageData, quizData, isPublished 
      } = req.body;

      console.log(`🔍 Mise à jour de la leçon ID: ${id}`);

      const existingLesson = await withQueryTimeout(
        sql`
          SELECT * FROM lessons WHERE id = ${parseInt(id)}
        `,
        5000,
        'vérification de la leçon'
      );

      if (!existingLesson[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Leçon non trouvée' 
        });
        return;
      }

      if (!user.isAdmin && existingLesson[0].profile_id !== user.profileId) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      const result = await withQueryTimeout(
        sql`
          UPDATE lessons 
          SET 
            title = COALESCE(${title}, title),
            description = COALESCE(${description}, description),
            subject = COALESCE(${subject}, subject),
            level = COALESCE(${level}, level),
            image_filename = COALESCE(${imageFilename}, image_filename),
            image_data = COALESCE(${imageData}, image_data),
            quiz_data = COALESCE(${quizData ? JSON.stringify(quizData) : null}, quiz_data),
            is_published = COALESCE(${isPublished}, is_published),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${parseInt(id)}
          RETURNING *
        `,
        5000,
        'mise à jour de la leçon'
      );

      res.status(200).json({
        success: true,
        message: 'Leçon modifiée avec succès',
        data: { lesson: result[0] }
      });

    } else if (req.method === 'DELETE') {
      // Authentification requise pour DELETE
      const user = authenticateToken(req);
      
      console.log(`🔍 Suppression de la leçon ID: ${id}`);

      const existingLesson = await withQueryTimeout(
        sql`
          SELECT * FROM lessons WHERE id = ${parseInt(id)}
        `,
        5000,
        'vérification de la leçon'
      );

      if (!existingLesson[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Leçon non trouvée' 
        });
        return;
      }

      if (!user.isAdmin && existingLesson[0].profile_id !== user.profileId) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      const result = await withQueryTimeout(
        sql`
          DELETE FROM lessons 
          WHERE id = ${parseInt(id)}
          RETURNING *
        `,
        5000,
        'suppression de la leçon'
      );

      res.status(200).json({
        success: true,
        message: 'Leçon supprimée avec succès',
        data: { lesson: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    console.error('❌ Erreur dans handleLesson:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      pathname: req.url
    });
    const errorResponse = handleError(error, 'Erreur lors de la gestion de la leçon');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler des notifications
async function handleNotifications(req, res) {
  try {
    if (req.method === 'GET') {
      // Parser les query parameters depuis l'URL
      const url = new URL(req.url, `http://${req.headers.host}`);
      const profileId = url.searchParams.get('profileId');
      const isRead = url.searchParams.get('isRead');
      const type = url.searchParams.get('type');

      let query = sql`
        SELECT 
          n.id, n.type, n.title, n.message, n.data, 
          n.is_read, n.created_at,
          p.name as profile_name
        FROM notifications n
        JOIN profiles p ON n.profile_id = p.id
        WHERE 1=1
      `;

      if (profileId) {
        query = sql`${query} AND n.profile_id = ${profileId}`;
      } else {
        // Si pas de profileId, il faut être authentifié
        const user = authenticateToken(req);
        query = sql`${query} AND n.profile_id = ${user.profileId}`;
      }

      if (isRead !== undefined) {
        query = sql`${query} AND n.is_read = ${isRead === 'true'}`;
      }

      if (type) {
        query = sql`${query} AND n.type = ${type}`;
      }

      query = sql`${query} ORDER BY n.created_at DESC`;
      const notifications = await withQueryTimeout(query, 7000, 'récupération des notifications');

      res.status(200).json({
        success: true,
        message: 'Notifications récupérées avec succès',
        data: { notifications }
      });

    } else if (req.method === 'POST') {
      // Authentification requise pour POST
      const user = authenticateToken(req);
      
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const { profileId, type, title, message, data } = req.body;

      if (!profileId || !type || !title || !message) {
        res.status(400).json({ 
          success: false, 
          message: 'profileId, type, title et message requis' 
        });
        return;
      }

      const profile = await withQueryTimeout(
        sql`
          SELECT id FROM profiles WHERE id = ${profileId}
        `,
        5000,
        'vérification du profil'
      );

      if (!profile[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      const result = await withQueryTimeout(
        sql`
          INSERT INTO notifications (profile_id, type, title, message, data)
          VALUES (${profileId}, ${type}, ${title}, ${message}, ${data ? JSON.stringify(data) : null})
          RETURNING *
        `,
        5000,
        'création de la notification'
      );

      res.status(201).json({
        success: true,
        message: 'Notification créée avec succès',
        data: { notification: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des notifications');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler d'une notification spécifique
async function handleNotification(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.pathname.split('/').pop();

    if (!id) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de notification requis' 
      });
      return;
    }

    if (req.method === 'GET') {
      console.log(`🔍 Récupération de la notification ID: ${id} (type: ${typeof id})`);
      
      const notifications = await withQueryTimeout(
        sql`
          SELECT 
            n.id, n.type, n.title, n.message, n.data, 
            n.is_read, n.created_at,
            p.name as profile_name
          FROM notifications n
          JOIN profiles p ON n.profile_id = p.id
          WHERE n.id = ${parseInt(id)}
        `,
        5000,
        'récupération de la notification'
      );

      if (!notifications[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Notification non trouvée' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification récupérée avec succès',
        data: { notification: notifications[0] }
      });

    } else if (req.method === 'PUT') {
      // Authentification requise pour PUT
      const user = authenticateToken(req);
      
      const { isRead } = req.body;

      const existingNotification = await withQueryTimeout(
        sql`
          SELECT * FROM notifications WHERE id = ${parseInt(id)}
        `,
        5000,
        'vérification de la notification'
      );

      if (!existingNotification[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Notification non trouvée' 
        });
        return;
      }

      if (!user.isAdmin && existingNotification[0].profile_id !== user.profileId) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      const result = await withQueryTimeout(
        sql`
          UPDATE notifications 
          SET 
            is_read = COALESCE(${isRead}, is_read),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${parseInt(id)}
          RETURNING *
        `,
        5000,
        'mise à jour de la notification'
      );

      res.status(200).json({
        success: true,
        message: 'Notification modifiée avec succès',
        data: { notification: result[0] }
      });

    } else if (req.method === 'DELETE') {
      // Authentification requise pour DELETE
      const user = authenticateToken(req);
      
      const existingNotification = await withQueryTimeout(
        sql`
          SELECT * FROM notifications WHERE id = ${parseInt(id)}
        `,
        5000,
        'vérification de la notification'
      );

      if (!existingNotification[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Notification non trouvée' 
        });
        return;
      }

      if (!user.isAdmin && existingNotification[0].profile_id !== user.profileId) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      const result = await withQueryTimeout(
        sql`
          DELETE FROM notifications 
          WHERE id = ${parseInt(id)}
          RETURNING *
        `,
        5000,
        'suppression de la notification'
      );

      res.status(200).json({
        success: true,
        message: 'Notification supprimée avec succès',
        data: { notification: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion de la notification');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler des activités
async function handleActivities(req, res) {
  try {
    if (req.method === 'GET') {
      const activities = await withQueryTimeout(
        sql`
          SELECT 
            id, title, description, type, status, difficulty_level,
            estimated_duration, target_age_group, subject_area,
            is_active, created_at, updated_at
          FROM activities 
          WHERE is_active = true
          ORDER BY created_at DESC
        `,
        7000,
        'récupération des activités'
      );

      res.status(200).json({
        success: true,
        message: 'Activités récupérées avec succès',
        data: {
          activities: activities || []
        }
      });

    } else if (req.method === 'POST') {
      const {
        title,
        description,
        type,
        difficulty_level,
        estimated_duration,
        target_age_group,
        subject_area
      } = req.body;

      if (!title || !description || !type) {
        res.status(400).json({
          success: false,
          message: 'Titre, description et type sont requis'
        });
        return;
      }

      const newActivity = await withQueryTimeout(
        sql`
          INSERT INTO activities (
            title, description, type, difficulty_level,
            estimated_duration, target_age_group, subject_area,
            status, is_active
          )
          VALUES (
            ${title}, ${description}, ${type}, ${difficulty_level || 'medium'},
            ${estimated_duration || 30}, ${target_age_group || '6-12'}, 
            ${subject_area || 'general'}, 'active', true
          )
          RETURNING *
        `,
        5000,
        'création de l\'activité'
      );

      res.status(201).json({
        success: true,
        message: 'Activité créée avec succès',
        data: {
          activity: newActivity[0]
        }
      });

    } else {
      res.status(405).json({ error: 'Méthode non autorisée' });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des activités');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler des vidéos YouTube
async function handleYoutubeVideos(req, res) {
  try {
    if (req.method === 'GET') {
      const videos = await withQueryTimeout(
        sql`
          SELECT 
            id, url, video_id, title, description, category,
            age_group, is_active, created_at, updated_at
          FROM youtube_videos 
          WHERE is_active = true
          ORDER BY created_at DESC
        `,
        7000,
        'récupération des vidéos YouTube'
      );

      res.status(200).json({
        success: true,
        message: 'Vidéos YouTube récupérées avec succès',
        data: {
          videos: videos || []
        }
      });

    } else if (req.method === 'POST') {
      const {
        url,
        video_id,
        title,
        description,
        category,
        age_group
      } = req.body;

      if (!url || !video_id || !title) {
        res.status(400).json({
          success: false,
          message: 'URL, video_id et titre sont requis'
        });
        return;
      }

      const newVideo = await withQueryTimeout(
        sql`
          INSERT INTO youtube_videos (
            url, video_id, title, description, category, age_group, is_active
          )
          VALUES (
            ${url}, ${video_id}, ${title}, ${description || ''}, 
            ${category || 'general'}, ${age_group || '6-12'}, true
          )
          RETURNING *
        `,
        5000,
        'création de la vidéo YouTube'
      );

      res.status(201).json({
        success: true,
        message: 'Vidéo YouTube créée avec succès',
        data: {
          video: newVideo[0]
        }
      });

    } else {
      res.status(405).json({ error: 'Méthode non autorisée' });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des vidéos YouTube');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler des codes PIN
async function handlePin(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const profileId = pathParts[3]; // /api/profiles/{id}/pin

    // Validation et conversion de l'ID
    const profileIdNum = parseInt(profileId, 10);
    console.log(`🔍 Debug - profileId original: "${profileId}" (type: ${typeof profileId})`);
    console.log(`🔍 Debug - profileIdNum après parseInt: ${profileIdNum} (type: ${typeof profileIdNum}, isNaN: ${isNaN(profileIdNum)})`);

    if (!profileId || isNaN(profileIdNum)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de profil invalide' 
      });
      return;
    }

    if (req.method === 'GET') {
      // Récupérer le code PIN (pour vérification)
      const queryText = 'SELECT pin_code, created_at, updated_at FROM pin_codes WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1';
      const queryParams = [profileIdNum];
      const query = sql(queryText, queryParams);

      console.log(`🔧 Requête GET PIN construite manuellement:`);
      console.log(`   Text: ${queryText}`);
      console.log(`   Params: ${JSON.stringify(queryParams)}`);

      const pinData = await withQueryTimeout(
        query,
        5000,
        'récupération du PIN'
      );

      if (!pinData[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Code PIN non trouvé' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Code PIN récupéré avec succès',
        data: { 
          hasPin: true,
          createdAt: pinData[0].created_at,
          updatedAt: pinData[0].updated_at
        }
      });

    } else if (req.method === 'POST') {
      // Vérifier un code PIN
      const { pin } = req.body;

      if (!pin) {
        res.status(400).json({ 
          success: false, 
          message: 'Code PIN requis' 
        });
        return;
      }

      // Construire la requête manuellement pour garantir l'injection correcte des paramètres
      const queryText = 'SELECT pin_code FROM pin_codes WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1';
      const queryParams = [profileIdNum];
      const query = sql(queryText, queryParams);

      console.log(`🔧 Requête POST PIN construite manuellement:`);
      console.log(`   Text: ${queryText}`);
      console.log(`   Params: ${JSON.stringify(queryParams)}`);

      const pinData = await withQueryTimeout(
        query,
        5000,
        'vérification du PIN'
      );

      if (!pinData[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Code PIN non trouvé' 
        });
        return;
      }

      const isValidPin = await NativeHashService.verifyPin(pin, pinData[0].pin_code);
      
      res.status(200).json({
        success: true,
        message: isValidPin ? 'Code PIN valide' : 'Code PIN invalide',
        data: { isValid: isValidPin }
      });

    } else if (req.method === 'PUT') {
      // Mettre à jour un code PIN
      const { newPin, currentPin } = req.body;

      if (!newPin) {
        res.status(400).json({ 
          success: false, 
          message: 'Nouveau code PIN requis' 
        });
        return;
      }

      // Vérifier le code PIN actuel si fourni
      if (currentPin) {
        const checkQueryText = 'SELECT pin_code FROM pin_codes WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1';
        const checkQueryParams = [profileIdNum];
        const checkQuery = sql(checkQueryText, checkQueryParams);

        console.log(`🔧 Requête vérification PIN actuel construite manuellement:`);
        console.log(`   Text: ${checkQueryText}`);
        console.log(`   Params: ${JSON.stringify(checkQueryParams)}`);

        const pinData = await withQueryTimeout(
          checkQuery,
          5000,
          'vérification du PIN actuel'
        );

        if (pinData[0]) {
          const isValidCurrentPin = await NativeHashService.verifyPin(currentPin, pinData[0].pin_code);
          if (!isValidCurrentPin) {
            res.status(401).json({ 
              success: false, 
              message: 'Code PIN actuel incorrect' 
            });
            return;
          }
        }
      }

      // Valider le nouveau code PIN
      if (newPin.length < 4 || newPin.length > 8) {
        res.status(400).json({ 
          success: false, 
          message: 'Le code PIN doit contenir entre 4 et 8 caractères' 
        });
        return;
      }

      // Hacher le nouveau code PIN
      const hashedPin = await NativeHashService.hashPin(newPin);

      // Vérifier si un code PIN existe déjà
      const checkExistingQueryText = 'SELECT id FROM pin_codes WHERE profile_id = $1';
      const checkExistingQueryParams = [profileIdNum];
      const checkExistingQuery = sql(checkExistingQueryText, checkExistingQueryParams);

      console.log(`🔧 Requête vérification PIN existant construite manuellement:`);
      console.log(`   Text: ${checkExistingQueryText}`);
      console.log(`   Params: ${JSON.stringify(checkExistingQueryParams)}`);

      const existingPin = await withQueryTimeout(
        checkExistingQuery,
        5000,
        'vérification PIN existant'
      );

      let result;
      if (existingPin[0]) {
        // Mettre à jour le code PIN existant
        const updateQueryText = 'UPDATE pin_codes SET pin_code = $1, updated_at = CURRENT_TIMESTAMP WHERE profile_id = $2 RETURNING *';
        const updateQueryParams = [hashedPin, profileIdNum];
        const updateQuery = sql(updateQueryText, updateQueryParams);

        console.log(`🔧 Requête UPDATE PIN construite manuellement:`);
        console.log(`   Text: ${updateQueryText}`);
        console.log(`   Params: ${JSON.stringify(updateQueryParams)}`);

        result = await withQueryTimeout(
          updateQuery,
          5000,
          'mise à jour du PIN'
        );
      } else {
        // Créer un nouveau code PIN
        const insertQueryText = 'INSERT INTO pin_codes (profile_id, pin_code) VALUES ($1, $2) RETURNING *';
        const insertQueryParams = [profileIdNum, hashedPin];
        const insertQuery = sql(insertQueryText, insertQueryParams);

        console.log(`🔧 Requête INSERT PIN construite manuellement:`);
        console.log(`   Text: ${insertQueryText}`);
        console.log(`   Params: ${JSON.stringify(insertQueryParams)}`);

        result = await withQueryTimeout(
          insertQuery,
          5000,
          'création du PIN'
        );
      }

      res.status(200).json({
        success: true,
        message: 'Code PIN mis à jour avec succès',
        data: { pin: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion du code PIN');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler des statistiques des profils
async function handleProfileStats(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }

    const [totalProfiles, activeProfiles, childProfiles, teenProfiles, adminProfiles] = await Promise.all([
      withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles`, 5000, 'stats total profils'),
      withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles WHERE is_active = true`, 5000, 'stats profils actifs'),
      withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles WHERE is_child = true`, 5000, 'stats profils enfants'),
      withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles WHERE is_teen = true`, 5000, 'stats profils ados'),
      withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles WHERE is_admin = true`, 5000, 'stats profils admin')
    ]);

    res.status(200).json({
      success: true,
      message: 'Statistiques des profils récupérées avec succès',
      data: {
        total: totalProfiles[0].count,
        active: activeProfiles[0].count,
        children: childProfiles[0].count,
        teens: teenProfiles[0].count,
        admins: adminProfiles[0].count
      }
    });

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la récupération des statistiques des profils');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler d'initialisation des pins
async function handleInitPins(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }

    // Logique d'initialisation des pins
    res.json({ success: true, message: 'Pins initialisés' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Handler des logs d'audit
async function handleAudit(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // POST /api/audit/logs - Créer un log d'audit
    if (pathname === '/api/audit/logs' && req.method === 'POST') {
      const { action, userId, category, level = 'info', details = {}, ipAddress, userAgent } = req.body;

      if (!action || !userId || !category) {
        res.status(400).json({
          success: false,
          message: 'Action, userId et category sont requis'
        });
        return;
      }

      // Construire la requête INSERT manuellement
      const insertQueryText = 'INSERT INTO audit_logs (action, user_id, category, level, details, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *';
      const insertQueryParams = [
        action,
        userId,
        category,
        level,
        JSON.stringify(details),
        ipAddress || null,
        userAgent || null
      ];

      console.log(`🔧 Requête INSERT audit log construite manuellement:`);
      console.log(`   Text: ${insertQueryText}`);
      console.log(`   Params: ${JSON.stringify(insertQueryParams)}`);

      const insertQuery = sql(insertQueryText, insertQueryParams);

      const result = await withQueryTimeout(
        insertQuery,
        5000,
        'création du log d\'audit'
      );

      res.status(201).json({
        success: true,
        message: 'Log d\'audit créé avec succès',
        data: { log: result[0] }
      });

    // GET /api/audit/logs - Récupérer les logs d'audit
    } else if (pathname === '/api/audit/logs' && req.method === 'GET') {
      // Authentification requise pour GET
      const user = authenticateToken(req);
      
      const userId = url.searchParams.get('userId');
      const category = url.searchParams.get('category');
      const level = url.searchParams.get('level');
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      // Construire la requête SELECT avec filtres
      let queryText = 'SELECT id, action, user_id, category, level, details, ip_address, user_agent, created_at FROM audit_logs WHERE 1=1';
      const queryParams = [];
      let paramIndex = 1;

      if (userId) {
        queryText += ` AND user_id = $${paramIndex++}`;
        queryParams.push(userId);
      }
      if (category) {
        queryText += ` AND category = $${paramIndex++}`;
        queryParams.push(category);
      }
      if (level) {
        queryText += ` AND level = $${paramIndex++}`;
        queryParams.push(level);
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);

      console.log(`🔧 Requête GET audit logs construite manuellement:`);
      console.log(`   Text: ${queryText}`);
      console.log(`   Params: ${JSON.stringify(queryParams)}`);

      const query = sql(queryText, queryParams);

      const logs = await withQueryTimeout(
        query,
        5000,
        'récupération des logs d\'audit'
      );

      // Parser les détails JSON
      const parsedLogs = logs.map(log => ({
        ...log,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
      }));

      res.status(200).json({
        success: true,
        message: 'Logs d\'audit récupérés avec succès',
        data: { logs: parsedLogs }
      });

    // GET /api/audit/stats - Statistiques de sécurité
    } else if (pathname === '/api/audit/stats' && req.method === 'GET') {
      // Authentification requise pour GET
      const user = authenticateToken(req);
      
      const days = parseInt(url.searchParams.get('days') || '7', 10);

      // Construire la requête pour les statistiques avec paramètres
      const statsQueryText = `
        SELECT 
          COUNT(*) FILTER (WHERE level = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE level = 'error') as error_count,
          COUNT(*) FILTER (WHERE level = 'warning') as warning_count,
          COUNT(*) FILTER (WHERE level = 'info') as info_count,
          COUNT(*) FILTER (WHERE category = 'security') as security_count,
          COUNT(*) FILTER (WHERE category = 'authentication') as auth_count
        FROM audit_logs 
        WHERE created_at >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * $1)
      `;
      const statsQueryParams = [days];
      const statsQuery = sql(statsQueryText, statsQueryParams);

      console.log(`🔧 Requête GET audit stats construite manuellement:`);
      console.log(`   Text: ${statsQueryText}`);
      console.log(`   Params: ${JSON.stringify(statsQueryParams)}`);

      const stats = await withQueryTimeout(
        statsQuery,
        5000,
        'récupération des statistiques d\'audit'
      );

      res.status(200).json({
        success: true,
        message: 'Statistiques d\'audit récupérées avec succès',
        data: stats[0] || {}
      });

    // POST /api/audit/export - Exporter les logs
    } else if (pathname === '/api/audit/export' && req.method === 'POST') {
      // Authentification requise pour export
      const user = authenticateToken(req);
      
      const { filters = {} } = req.body;

      // Construire la requête avec filtres
      let queryText = 'SELECT * FROM audit_logs WHERE 1=1';
      const queryParams = [];
      let paramIndex = 1;

      if (filters.userId) {
        queryText += ` AND user_id = $${paramIndex++}`;
        queryParams.push(filters.userId);
      }
      if (filters.category) {
        queryText += ` AND category = $${paramIndex++}`;
        queryParams.push(filters.category);
      }
      if (filters.level) {
        queryText += ` AND level = $${paramIndex++}`;
        queryParams.push(filters.level);
      }
      if (filters.startDate) {
        queryText += ` AND created_at >= $${paramIndex++}`;
        queryParams.push(filters.startDate);
      }
      if (filters.endDate) {
        queryText += ` AND created_at <= $${paramIndex++}`;
        queryParams.push(filters.endDate);
      }

      queryText += ' ORDER BY created_at DESC';

      const query = sql(queryText, queryParams);

      const logs = await withQueryTimeout(
        query,
        5000,
        'export des logs d\'audit'
      );

      // Formater en CSV
      const csv = logs.map(log => {
        const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
        return `${log.id},${log.action},${log.user_id},${log.category},${log.level},"${details}",${log.ip_address || ''},${log.user_agent || ''},${log.created_at}`;
      }).join('\n');

      const csvHeader = 'id,action,user_id,category,level,details,ip_address,user_agent,created_at\n';

      res.status(200).json({
        success: true,
        message: 'Logs exportés avec succès',
        data: { export: csvHeader + csv }
      });

    } else {
      res.status(404).json({
        success: false,
        message: 'Endpoint audit non trouvé'
      });
    }

  } catch (error) {
    console.error('❌ Erreur dans handleAudit:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    const errorResponse = handleError(error, 'Erreur lors de la gestion des logs d\'audit');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}