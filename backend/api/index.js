// Import des dépendances
const { NativeHashService } = require('../lib/nativeHash.js');
const sql = require('../lib/database.js').default;
const { generateToken, createSession, authenticateToken, deleteSession } = require('../lib/auth.js');
const { handleError } = require('../lib/response.js');
const handleBadges = require('./badges.js');

module.exports = async function handler(req, res) {
  // Configuration CORS complète
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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

    // Route d'initialisation des pins
    if (pathname === '/api/init-pins') {
      return await handleInitPins(req, res);
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
      sql`SELECT * FROM profiles WHERE id = ${profileId} AND is_active = true`,
      sql`SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1`
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
      const profiles = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, level, created_at, updated_at
        FROM profiles 
        ORDER BY created_at DESC
      `;

      res.status(200).json({
        success: true,
        message: 'Profils récupérés avec succès',
        data: { profiles }
      });

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

      const result = await sql`
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
      `;

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
      const profiles = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, level, created_at, updated_at
        FROM profiles 
        WHERE id = ${id}
      `;

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

      const result = await sql`
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
      `;

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

      const result = await sql`
        DELETE FROM profiles 
        WHERE id = ${id}
        RETURNING *
      `;

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

      const pinData = await sql`
        SELECT pin_code, created_at FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
      `;

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

      const existingPin = await sql`
        SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
      `;

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
      const profile = await sql`
        SELECT id FROM profiles WHERE id = ${profileId}
      `;

      if (!profile[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      // Vérifier le PIN actuel si fourni (sécurité additionnelle)
      if (currentPin) {
        const existingPin = await sql`
          SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
        `;

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
      const result = await sql`
        INSERT INTO pin_codes (profile_id, pin_code)
        VALUES (${profileId}, ${hashedPin})
        RETURNING profile_id, created_at
      `;

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
      const { profileId, published } = req.query;

      let lessons;
      
      if (profileId && published !== undefined) {
        // Les deux paramètres sont fournis
        lessons = await sql`
          SELECT 
            l.id, l.title, l.description, l.subject, l.level, 
            l.image_filename, l.image_data, l.quiz_data, 
            l.is_published, l.created_at, l.updated_at,
            p.name as profile_name
          FROM lessons l
          JOIN profiles p ON l.profile_id = p.id
          WHERE l.profile_id = ${parseInt(profileId)} 
            AND l.is_published = ${published === 'true'}
          ORDER BY l.created_at DESC
        `;
      } else if (profileId) {
        // Seulement profileId
        lessons = await sql`
          SELECT 
            l.id, l.title, l.description, l.subject, l.level, 
            l.image_filename, l.image_data, l.quiz_data, 
            l.is_published, l.created_at, l.updated_at,
            p.name as profile_name
          FROM lessons l
          JOIN profiles p ON l.profile_id = p.id
          WHERE l.profile_id = ${parseInt(profileId)}
          ORDER BY l.created_at DESC
        `;
      } else if (published !== undefined) {
        // Seulement published
        lessons = await sql`
          SELECT 
            l.id, l.title, l.description, l.subject, l.level, 
            l.image_filename, l.image_data, l.quiz_data, 
            l.is_published, l.created_at, l.updated_at,
            p.name as profile_name
          FROM lessons l
          JOIN profiles p ON l.profile_id = p.id
          WHERE l.is_published = ${published === 'true'}
          ORDER BY l.created_at DESC
        `;
      } else {
        // Aucun paramètre - toutes les leçons
        lessons = await sql`
          SELECT 
            l.id, l.title, l.description, l.subject, l.level, 
            l.image_filename, l.image_data, l.quiz_data, 
            l.is_published, l.created_at, l.updated_at,
            p.name as profile_name
          FROM lessons l
          JOIN profiles p ON l.profile_id = p.id
          ORDER BY l.created_at DESC
        `;
      }

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

      if (!title || !quizData) {
        res.status(400).json({ 
          success: false, 
          message: 'Titre et données de quiz requis' 
        });
        return;
      }

      const result = await sql`
        INSERT INTO lessons (
          profile_id, title, description, subject, level,
          image_filename, image_data, quiz_data, is_published
        )
        VALUES (
          ${user.profileId}, ${title}, ${description}, ${subject}, ${level},
          ${imageFilename}, ${imageData}, ${JSON.stringify(quizData)}, ${isPublished}
        )
        RETURNING *
      `;

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
    const errorResponse = handleError(error, 'Erreur lors de la gestion des leçons');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler d'une leçon spécifique
async function handleLesson(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.pathname.split('/').pop();

    if (!id) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de leçon requis' 
      });
      return;
    }

    if (req.method === 'GET') {
      const lessons = await sql`
        SELECT 
          l.id, l.title, l.description, l.subject, l.level, 
          l.image_filename, l.image_data, l.quiz_data, 
          l.is_published, l.created_at, l.updated_at,
          p.name as profile_name, p.id as profile_id
        FROM lessons l
        JOIN profiles p ON l.profile_id = p.id
        WHERE l.id = ${id}
      `;

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

    } else if (req.method === 'PUT') {
      // Authentification requise pour PUT
      const user = authenticateToken(req);
      
      const { 
        title, description, subject, level, 
        imageFilename, imageData, quizData, isPublished 
      } = req.body;

      const existingLesson = await sql`
        SELECT * FROM lessons WHERE id = ${id}
      `;

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

      const result = await sql`
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
        WHERE id = ${id}
        RETURNING *
      `;

      res.status(200).json({
        success: true,
        message: 'Leçon modifiée avec succès',
        data: { lesson: result[0] }
      });

    } else if (req.method === 'DELETE') {
      // Authentification requise pour DELETE
      const user = authenticateToken(req);
      
      const existingLesson = await sql`
        SELECT * FROM lessons WHERE id = ${id}
      `;

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

      const result = await sql`
        DELETE FROM lessons 
        WHERE id = ${id}
        RETURNING *
      `;

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
    const errorResponse = handleError(error, 'Erreur lors de la gestion de la leçon');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

// Handler des notifications
async function handleNotifications(req, res) {
  try {
    if (req.method === 'GET') {
      const { profileId, isRead, type } = req.query;

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
      const notifications = await query;

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

      const profile = await sql`
        SELECT id FROM profiles WHERE id = ${profileId}
      `;

      if (!profile[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      const result = await sql`
        INSERT INTO notifications (profile_id, type, title, message, data)
        VALUES (${profileId}, ${type}, ${title}, ${message}, ${data ? JSON.stringify(data) : null})
        RETURNING *
      `;

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
      const notifications = await sql`
        SELECT 
          n.id, n.type, n.title, n.message, n.data, 
          n.is_read, n.created_at,
          p.name as profile_name
        FROM notifications n
        JOIN profiles p ON n.profile_id = p.id
        WHERE n.id = ${id}
      `;

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

      const existingNotification = await sql`
        SELECT * FROM notifications WHERE id = ${id}
      `;

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

      const result = await sql`
        UPDATE notifications 
        SET 
          is_read = COALESCE(${isRead}, is_read),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

      res.status(200).json({
        success: true,
        message: 'Notification modifiée avec succès',
        data: { notification: result[0] }
      });

    } else if (req.method === 'DELETE') {
      // Authentification requise pour DELETE
      const user = authenticateToken(req);
      
      const existingNotification = await sql`
        SELECT * FROM notifications WHERE id = ${id}
      `;

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

      const result = await sql`
        DELETE FROM notifications 
        WHERE id = ${id}
        RETURNING *
      `;

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
      const activities = await sql`
        SELECT 
          id, title, description, type, status, difficulty_level,
          estimated_duration, target_age_group, subject_area,
          is_active, created_at, updated_at
        FROM activities 
        WHERE is_active = true
        ORDER BY created_at DESC
      `;

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

      const newActivity = await sql`
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
      `;

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
      const videos = await sql`
        SELECT 
          id, url, video_id, title, description, category,
          age_group, is_active, created_at, updated_at
        FROM youtube_videos 
        WHERE is_active = true
        ORDER BY created_at DESC
      `;

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

      const newVideo = await sql`
        INSERT INTO youtube_videos (
          url, video_id, title, description, category, age_group, is_active
        )
        VALUES (
          ${url}, ${video_id}, ${title}, ${description || ''}, 
          ${category || 'general'}, ${age_group || '6-12'}, true
        )
        RETURNING *
      `;

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

    if (!profileId) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de profil requis' 
      });
      return;
    }

    if (req.method === 'GET') {
      // Récupérer le code PIN (pour vérification)
      const pinData = await sql`
        SELECT pin_code, created_at, updated_at
        FROM pin_codes 
        WHERE profile_id = ${profileId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

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

      const pinData = await sql`
        SELECT pin_code FROM pin_codes 
        WHERE profile_id = ${profileId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

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
        const pinData = await sql`
          SELECT pin_code FROM pin_codes 
          WHERE profile_id = ${profileId}
          ORDER BY created_at DESC
          LIMIT 1
        `;

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
      const existingPin = await sql`
        SELECT id FROM pin_codes WHERE profile_id = ${profileId}
      `;

      let result;
      if (existingPin[0]) {
        // Mettre à jour le code PIN existant
        result = await sql`
          UPDATE pin_codes 
          SET 
            pin_code = ${hashedPin},
            updated_at = CURRENT_TIMESTAMP
          WHERE profile_id = ${profileId}
          RETURNING *
        `;
      } else {
        // Créer un nouveau code PIN
        result = await sql`
          INSERT INTO pin_codes (profile_id, pin_code)
          VALUES (${profileId}, ${hashedPin})
          RETURNING *
        `;
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

    const totalProfiles = await sql`
      SELECT COUNT(*) as count FROM profiles
    `;

    const activeProfiles = await sql`
      SELECT COUNT(*) as count FROM profiles WHERE is_active = true
    `;

    const childProfiles = await sql`
      SELECT COUNT(*) as count FROM profiles WHERE is_child = true
    `;

    const teenProfiles = await sql`
      SELECT COUNT(*) as count FROM profiles WHERE is_teen = true
    `;

    const adminProfiles = await sql`
      SELECT COUNT(*) as count FROM profiles WHERE is_admin = true
    `;

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