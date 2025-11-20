// Import des dépendances
const { handleLogin, handleLogout } = require('../controllers/authController.js');
const { handleProfiles, handleProfile, handleProfileStats, handleProfilePin, handlePin } = require('../controllers/profileController.js');
const { handleLessons, handleLesson } = require('../controllers/lessonController.js');
const { handleNotifications, handleNotification } = require('../controllers/notificationController.js');
const { handleActivities } = require('../controllers/activityController.js');
const { handleYoutubeVideos } = require('../controllers/youtubeController.js');
const { handleInitPins } = require('../controllers/initController.js');
const { handleAudit } = require('../controllers/auditController.js');
const handleBadges = require('./badges.js');
const handleAI = require('./ai.js');
const { runCors } = require('../lib/cors.js');

module.exports = async function handler(req, res) {

  // Appliquer CORS
  try {
    await runCors(req, res);
  } catch (error) {
    console.error('Erreur CORS:', error);
    return res.status(500).json({ error: 'Erreur configuration CORS' });
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