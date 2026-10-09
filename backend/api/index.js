// Import des dépendances
const express = require('express');
const router = express.Router();

const { handleLogin, handleLogout, handleVerify, handleFamilyGate } = require('../controllers/authController.js');
const { handleProfiles, handleProfile, handleProfileStats, handlePin, handleProfileLearningStats, handleProfileCreationRequest } = require('../controllers/profileController.js');
const { handleLessons, handleLesson, handleQuizResults, handleGlobalLessonStats } = require('../controllers/lessonController.js');
const { handleCoursePages, handleCoursePage, handleCoursePageResults } = require('../controllers/coursePageController.js');
const { handleNotifications, handleNotification } = require('../controllers/notificationController.js');
const { handleActivities } = require('../controllers/activityController.js');
const { handleYoutubeVideos } = require('../controllers/youtubeController.js');
const { handleAudit } = require('../controllers/auditController.js');
const { handleProfileProgressSummary } = require('../controllers/progressController.js');
const handleBadges = require('./badges.js');
const handleAI = require('./ai/index.js');
const { createRateLimiter, getClientIp } = require('../lib/rateLimit.js');
const { requireMember, requireAdmin, requireAdminForWrites } = require('../lib/auth.js');
const { validate } = require('../lib/validation.js');
const {
    loginSchema,
    familyGateCheckSchema,
    familyGateUpdateSchema,
    pinVerifySchema,
    pinUpdateSchema,
    profileCreationRequestSchema,
    coursePageCreateSchema,
    coursePageUpdateSchema
} = require('../lib/schemas.js');

// Rate limiting (stabilité prod)
// Configurable via env:
// - API_RATE_LIMIT_LOGIN_WINDOW_MS, API_RATE_LIMIT_LOGIN_MAX
// - API_RATE_LIMIT_PIN_WINDOW_MS, API_RATE_LIMIT_PIN_MAX
const loginRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.API_RATE_LIMIT_LOGIN_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.API_RATE_LIMIT_LOGIN_MAX || '20', 10),
  keyGenerator: (req) => `login:${getClientIp(req)}`,
  message: 'Trop de tentatives de connexion. Veuillez réessayer.',
  code: 'RATE_LIMIT_LOGIN'
});

const pinRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.API_RATE_LIMIT_PIN_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.API_RATE_LIMIT_PIN_MAX || '5', 10),
  keyGenerator: (req) => {
    const profileId = req.params?.id || 'unknown';
    return `pin:${getClientIp(req)}:${profileId}`;
  },
  message: 'Trop de tentatives de vérification du PIN. Veuillez réessayer.',
  code: 'RATE_LIMIT_PIN'
});

const auditLogRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_AUDIT_MAX || '60', 10),
  keyGenerator: (req) => `audit_log:${getClientIp(req)}`,
  message: 'Trop de journaux envoyés. Veuillez réessayer.',
  code: 'RATE_LIMIT_AUDIT'
});

const profileRequestRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.API_RATE_LIMIT_PROFILE_REQUEST_WINDOW_MS || String(10 * 60 * 1000), 10),
  max: parseInt(process.env.API_RATE_LIMIT_PROFILE_REQUEST_MAX || '5', 10),
  keyGenerator: (req) => `profile_request:${getClientIp(req)}`,
  message: 'Trop de demandes de création. Veuillez réessayer plus tard.',
  code: 'RATE_LIMIT_PROFILE_REQUEST'
});

const familyGateRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.API_RATE_LIMIT_FAMILY_GATE_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.API_RATE_LIMIT_FAMILY_GATE_MAX || '20', 10),
  keyGenerator: (req) => `family_gate:${getClientIp(req)}`,
  message: 'Trop de tentatives. Veuillez réessayer.',
  code: 'RATE_LIMIT_FAMILY_GATE'
});

// ─── Routes publiques (aucun jeton) ────────────────────────────────────────────
router.post('/auth/login', loginRateLimiter, validate(loginSchema), handleLogin);
router.post('/auth/logout', handleLogout);
router.get('/auth/verify', handleVerify);
router.post('/auth/family-gate', familyGateRateLimiter, validate(familyGateCheckSchema), handleFamilyGate);
// Envoi d'un log d'audit : public pour tracer les événements pré-authentification
// (champs whitelistés, ip/user-agent dérivés du serveur), mais limité en débit.
router.use('/audit', (req, res, next) => (
  req.method === 'POST' && req.path === '/logs' ? auditLogRateLimiter(req, res, () => handleAudit(req, res)) : next()
));

// ─── Tout le reste exige un jeton (famille ou profil) ─────────────────────────
// Placé APRÈS les routes publiques : une route ajoutée plus bas est protégée par défaut.
router.use(requireMember);

router.put('/auth/family-gate', requireAdmin, validate(familyGateUpdateSchema), handleFamilyGate);

// Routes des profils
router.get('/profiles/stats', requireAdmin, handleProfileStats);
router.post('/profiles/requests', profileRequestRateLimiter, validate(profileCreationRequestSchema), handleProfileCreationRequest);
router.get('/profiles/:id/stats', handleProfileLearningStats);
router.get('/profiles/:id/learning-stats', handleProfileLearningStats);
router.get('/profiles/:id/progress-summary', handleProfileProgressSummary);
router.post('/profiles/:id/pin', pinRateLimiter, validate(pinVerifySchema), handlePin);
router.get('/profiles/:id/pin', requireAdmin, handlePin);
router.put('/profiles/:id/pin', requireAdmin, validate(pinUpdateSchema), handlePin);
router.get('/profiles', handleProfiles);
router.post('/profiles', requireAdmin, handleProfiles);
router.get('/profiles/:id', handleProfile);
router.put('/profiles/:id', requireAdmin, handleProfile);
router.delete('/profiles/:id', requireAdmin, handleProfile);

// Routes des leçons
router.get('/lessons', handleLessons);
router.post('/lessons', requireAdmin, handleLessons);
router.get('/lessons/stats/global', requireAdmin, handleGlobalLessonStats);
router.get('/lessons/:id/quiz-results', handleQuizResults);
router.post('/lessons/:id/quiz-results', handleQuizResults);
router.get('/lessons/:id', handleLesson);
router.put('/lessons/:id', requireAdmin, handleLesson);
router.delete('/lessons/:id', requireAdmin, handleLesson);

// Routes des pages de cours HTML (publiées par un parent pour un enfant)
router.get('/course-pages', handleCoursePages);
router.post('/course-pages', requireAdmin, validate(coursePageCreateSchema), handleCoursePages);
router.post('/course-pages/:id/results', handleCoursePageResults);
router.put('/course-pages/:id/results/:resultId', handleCoursePageResults);
router.get('/course-pages/:id', handleCoursePage);
router.put('/course-pages/:id', requireAdmin, validate(coursePageUpdateSchema), handleCoursePage);
router.delete('/course-pages/:id', requireAdmin, handleCoursePage);

// Routes des notifications
router.get('/notifications', handleNotifications);
router.post('/notifications', requireAdmin, handleNotifications);
router.all('/notifications/:id', handleNotification);

// Routes des activités
router.get('/activities', handleActivities);
router.post('/activities', requireAdmin, handleActivities);

// Routes des vidéos YouTube
router.get('/youtube-videos', handleYoutubeVideos);
router.post('/youtube-videos', requireAdmin, handleYoutubeVideos);

// Routes des badges : lecture pour tous les membres, écriture (et check-unlock) parents uniquement
router.use('/badges', requireAdminForWrites, handleBadges);

// Routes IA : réservées aux parents (coût des appels LLM, réglage global du modèle)
router.use('/ai', requireAdmin, handleAI);

// Routes des logs d'audit : consultation/export parents uniquement
// (l'envoi POST /audit/logs est public, voir plus haut)
router.use('/audit', requireAdmin, handleAudit);

module.exports = router;