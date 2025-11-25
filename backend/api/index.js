// Import des dépendances
const express = require('express');
const router = express.Router();

const { handleLogin, handleLogout } = require('../controllers/authController.js');
const { handleProfiles, handleProfile, handleProfileStats, handleProfilePin, handlePin } = require('../controllers/profileController.js');
const { handleLessons, handleLesson, handleQuizResults } = require('../controllers/lessonController.js');
const { handleNotifications, handleNotification } = require('../controllers/notificationController.js');
const { handleActivities } = require('../controllers/activityController.js');
const { handleYoutubeVideos } = require('../controllers/youtubeController.js');
const { handleInitPins } = require('../controllers/initController.js');
const { handleAudit } = require('../controllers/auditController.js');
const handleBadges = require('./badges.js');
const handleAI = require('./ai/index.js');

// Routes d'authentification
router.post('/auth/login', handleLogin);
router.post('/auth/logout', handleLogout);

// Routes des profils
router.get('/profiles/stats', handleProfileStats);
router.post('/profiles/:id/pin', handlePin);
router.get('/profiles', handleProfiles);
router.get('/profiles/:id', handleProfile);
router.put('/profiles/:id', handleProfile);
router.delete('/profiles/:id', handleProfile);
// Note: handleProfile gère GET, PUT, DELETE, mais Express préfère des routes explicites.
// Si handleProfile vérifie la méthode, on peut utiliser router.all ou router.use pour ce chemin spécifique,
// mais il vaut mieux être explicite si possible.
// Pour l'instant, comme les contrôleurs vérifient souvent la méthode, on peut utiliser router.all
// ou mapper les méthodes supportées.
// D'après l'analyse, handleProfile semble gérer plusieurs méthodes.

// Routes des leçons
router.get('/lessons', handleLessons);
router.post('/lessons', handleLessons); // Si handleLessons gère aussi POST
router.all('/lessons/:id/quiz-results', handleQuizResults);
router.all('/lessons/:id', handleLesson);

// Routes des notifications
router.get('/notifications', handleNotifications);
router.post('/notifications', handleNotifications);
router.all('/notifications/:id', handleNotification);

// Routes des activités
router.get('/activities', handleActivities);

// Routes des vidéos YouTube
router.get('/youtube-videos', handleYoutubeVideos);

// Routes des badges
// handleBadges est probablement un handler qui gère sous-routes ou méthodes
router.use('/badges', handleBadges);

// Routes IA
router.use('/ai', handleAI);

// Route d'initialisation des pins
router.post('/init-pins', handleInitPins);

// Routes des logs d'audit
router.use('/audit', handleAudit);

module.exports = router;