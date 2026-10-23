// Import des dépendances
const express = require('express');
const router = express.Router();

const { handleLogin, handleLogout, handleVerify, handleFamilyGate } = require('../controllers/authController.js');
const { handleProfiles, handleProfile, handleProfileStats, handlePin, handleProfileLearningStats, handleProfileCreationRequest } = require('../controllers/profileController.js');
const { handleLessons, handleLesson, handleQuizResults, handleGlobalLessonStats } = require('../controllers/lessonController.js');
const {
  handleCoursePages,
  handleCoursePage,
  handleCoursePageView,
  handleCoursePagePreview,
  handleCoursePageRender,
  handleCoursePageResults
} = require('../controllers/coursePageController.js');
const { handleNotifications, handleNotification, handleMarkAllNotificationsRead } = require('../controllers/notificationController.js');
const { handleActivities, handleActivity } = require('../controllers/activityController.js');
const { handleYoutubeVideos, handleYoutubeVideo } = require('../controllers/youtubeController.js');
const { handleCreateAuditLog, handleAuditLogs, handleAuditStats, handleAuditExport } = require('../controllers/auditController.js');
const { handleProfileProgressSummary } = require('../controllers/progressController.js');
const badgesRouter = require('./badges.js');
const handleAI = require('./ai/index.js');
const { createRateLimiter, getClientIp } = require('../lib/rateLimit.js');
const { requireMember, requireAdmin, requireAdminForWrites } = require('../lib/auth.js');
const { requireProfileAccess } = require('../lib/scope.js');
const { validate } = require('../lib/validation.js');
const schemas = require('../lib/schemas.js');

// Rate limiting (stabilité prod)
// Configurable via env:
// - API_RATE_LIMIT_LOGIN_WINDOW_MS, API_RATE_LIMIT_LOGIN_MAX
// - API_RATE_LIMIT_PIN_WINDOW_MS, API_RATE_LIMIT_PIN_MAX
// - API_RATE_LIMIT_AUDIT_MAX (par IP), API_RATE_LIMIT_AUDIT_GLOBAL_MAX (toutes origines)
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

// Quota global (toutes IP confondues) : borne le volume écrit dans audit_logs
// même si les envois viennent de nombreuses adresses.
const auditLogGlobalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_AUDIT_GLOBAL_MAX || '300', 10),
  keyGenerator: () => 'audit_log:global',
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
router.post('/auth/logout', handleLogout);
router.get('/auth/verify', handleVerify);
router.post('/auth/family-gate', familyGateRateLimiter, validate(schemas.familyGateCheckSchema), handleFamilyGate);

// Connexion à un profil : derrière le code d'entrée familial (jeton famille ou profil
// requis). Le rate limiting passe avant la vérification du jeton.
router.post('/auth/login', loginRateLimiter, requireMember, validate(schemas.loginSchema), handleLogin);

// Page de cours chargée par l'iframe : pas d'en-tête Authorization possible, l'accès
// passe par le jeton d'affichage signé (5 min) délivré par POST /course-pages/:id/view.
router.get('/course-pages/render', validate(schemas.coursePageRenderQuerySchema, 'query'), handleCoursePageRender);

// ─── Tout le reste exige un jeton (famille ou profil) non révoqué ─────────────
// Placé APRÈS les routes publiques : une route ajoutée plus bas est protégée par défaut.
router.use(requireMember);

router.put('/auth/family-gate', requireAdmin, validate(schemas.familyGateUpdateSchema), handleFamilyGate);

// Routes des profils
router.get('/profiles/stats', requireAdmin, handleProfileStats);
router.post('/profiles/requests', profileRequestRateLimiter, validate(schemas.profileCreationRequestSchema), handleProfileCreationRequest);
router.get('/profiles/:id/stats', handleProfileLearningStats);
router.get('/profiles/:id/learning-stats', handleProfileLearningStats);
// requireProfileAccess : isolation vérifiée ici (le contrôleur de progression ne la gère pas seul)
router.get('/profiles/:id/progress-summary', requireProfileAccess('id'), handleProfileProgressSummary);
router.post('/profiles/:id/pin', pinRateLimiter, validate(schemas.pinVerifySchema), handlePin);
router.get('/profiles/:id/pin', requireAdmin, handlePin);
router.put('/profiles/:id/pin', requireAdmin, validate(schemas.pinUpdateSchema), handlePin);
router.get('/profiles', handleProfiles);
router.post('/profiles', requireAdmin, validate(schemas.profileCreateSchema), handleProfiles);
router.get('/profiles/:id', handleProfile);
router.put('/profiles/:id', requireAdmin, validate(schemas.profileUpdateSchema), handleProfile);
router.delete('/profiles/:id', requireAdmin, handleProfile);

// Routes des leçons
router.get('/lessons', validate(schemas.lessonListQuerySchema, 'query'), handleLessons);
router.post('/lessons', requireAdmin, validate(schemas.lessonCreateSchema), handleLessons);
router.get('/lessons/stats/global', requireAdmin, handleGlobalLessonStats);
router.get('/lessons/:id/quiz-results', handleQuizResults);
router.post('/lessons/:id/quiz-results', validate(schemas.lessonQuizResultSchema), handleQuizResults);
router.get('/lessons/:id', handleLesson);
router.put('/lessons/:id', requireAdmin, validate(schemas.lessonUpdateSchema), handleLesson);
router.delete('/lessons/:id', requireAdmin, handleLesson);

// Routes des pages de cours HTML (publiées par un parent pour un enfant)
router.get('/course-pages', validate(schemas.coursePageListQuerySchema, 'query'), handleCoursePages);
router.post('/course-pages', requireAdmin, validate(schemas.coursePageCreateSchema), handleCoursePages);
router.post('/course-pages/preview', requireAdmin, validate(schemas.coursePagePreviewSchema), handleCoursePagePreview);
router.post('/course-pages/:id/view', handleCoursePageView);
router.post('/course-pages/:id/results', validate(schemas.coursePageResultSchema), handleCoursePageResults);
router.put('/course-pages/:id/results/:resultId', validate(schemas.coursePageResultSchema), handleCoursePageResults);
router.get('/course-pages/:id', handleCoursePage);
router.put('/course-pages/:id', requireAdmin, validate(schemas.coursePageUpdateSchema), handleCoursePage);
router.delete('/course-pages/:id', requireAdmin, handleCoursePage);

// Routes des notifications
router.get('/notifications', validate(schemas.notificationListQuerySchema, 'query'), handleNotifications);
router.post('/notifications', requireAdmin, validate(schemas.notificationCreateSchema), handleNotifications);
// Avant /notifications/:id : sinon « mark-all-read » serait interprété comme un id
router.post('/notifications/mark-all-read', validate(schemas.markAllNotificationsReadSchema), handleMarkAllNotificationsRead);
router.put('/notifications/:id', validate(schemas.notificationUpdateSchema), handleNotification);
router.all('/notifications/:id', handleNotification);

// Routes des activités
router.get('/activities', validate(schemas.activityListQuerySchema, 'query'), handleActivities);
router.post('/activities', requireAdmin, validate(schemas.activityCreateSchema), handleActivities);
router.get('/activities/:id', handleActivity);
router.put('/activities/:id', requireAdmin, validate(schemas.activityUpdateSchema), handleActivity);
router.delete('/activities/:id', requireAdmin, handleActivity);

// Routes des vidéos YouTube
router.get('/youtube-videos', handleYoutubeVideos);
router.post('/youtube-videos', requireAdmin, validate(schemas.youtubeVideoCreateSchema), handleYoutubeVideos);
// Lecture par les enfants (vidéos actives uniquement), écriture réservée aux parents
router.get('/youtube-videos/:id', handleYoutubeVideo);
router.put('/youtube-videos/:id', requireAdmin, validate(schemas.youtubeVideoUpdateSchema), handleYoutubeVideo);
router.delete('/youtube-videos/:id', requireAdmin, handleYoutubeVideo);

// Routes des badges : lecture pour tous les membres, écriture (et check-unlock) parents uniquement
router.use('/badges', requireAdminForWrites, badgesRouter);

// Routes IA : réservées aux parents (coût des appels LLM, réglage global du modèle)
router.use('/ai', requireAdmin, handleAI);

// Journal d'audit : envoi par tout membre (userId dérivé du jeton, ip/user-agent du serveur),
// limité par IP et globalement ; consultation et export réservés aux parents.
router.post('/audit/logs', auditLogRateLimiter, auditLogGlobalRateLimiter, validate(schemas.auditLogCreateSchema), handleCreateAuditLog);
router.get('/audit/logs', requireAdmin, validate(schemas.auditLogsQuerySchema, 'query'), handleAuditLogs);
router.get('/audit/stats', requireAdmin, validate(schemas.auditStatsQuerySchema, 'query'), handleAuditStats);
router.post('/audit/export', requireAdmin, validate(schemas.auditExportSchema), handleAuditExport);

module.exports = router;
