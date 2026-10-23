/**
 * Schémas Zod des entrées API (corps et paramètres de requête).
 * Utilisés via le middleware validate() de lib/validation.js : une entrée
 * invalide donne un 400 VALIDATION_ERROR, jamais un 500.
 *
 * Les objets ne sont pas « strict » (sauf auth) : les clés inconnues sont ignorées,
 * ce qui permet aux anciens clients d'envoyer des champs devenus inutiles.
 */
const { z } = require('zod');
const { getConditionSupport } = require('./badgeConditions.js');

// Messages d'erreur par défaut en français (affichés par le frontend)
z.config(z.locales.fr());

const MAX_INT4 = 2147483647;

// Nombre entier : accepte un nombre ou une chaîne de chiffres (paramètres de requête)
function integer() {
  return z.preprocess(
    value => (typeof value === 'string' && /^-?\d+$/.test(value.trim()) ? Number(value.trim()) : value),
    z.number().int().min(-MAX_INT4).max(MAX_INT4)
  );
}

// ID numérique strictement positif (nombre ou chaîne de chiffres)
const numericIdSchema = z.preprocess(
  value => (typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value),
  z.number('Identifiant invalide').int('Identifiant invalide').positive('Identifiant invalide').max(MAX_INT4, 'Identifiant invalide')
);

// Booléen : accepte aussi 'true' / 'false' / '1' / '0' / 1 / 0
const booleanish = z.preprocess(value => {
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return value;
}, z.boolean());

// Texte optionnel : null accepté, chaîne nettoyée et bornée
function optionalText(max) {
  return z.string().trim().max(max, `Texte trop long (${max} caractères maximum)`).nullable().optional();
}

// Texte dont null devient '' (colonnes NOT NULL des anciens clients)
function textOrEmpty(max) {
  return z.string().trim().max(max, `Texte trop long (${max} caractères maximum)`).nullable().transform(value => value ?? '');
}

// Valeur JSON libre (objet ou tableau) dont la forme sérialisée est bornée
function boundedJson(maxLength, message) {
  return z.unknown().refine(value => {
    try {
      const serialized = JSON.stringify(value ?? null);
      return typeof serialized === 'string' && serialized.length <= maxLength;
    } catch (_error) {
      return false;
    }
  }, message);
}

// Copie les clés camelCase vers leur équivalent snake_case (les deux formes sont acceptées)
function withAliases(aliases, schema) {
  return z.preprocess(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const normalized = { ...value };
    for (const [alias, key] of Object.entries(aliases)) {
      if (normalized[alias] !== undefined && normalized[key] === undefined) {
        normalized[key] = normalized[alias];
      }
      delete normalized[alias];
    }
    return normalized;
  }, schema);
}

// Au moins un champ fourni (mises à jour partielles)
function nonEmptyUpdate(schema) {
  return schema.refine(
    value => Object.values(value).some(field => field !== undefined),
    'Aucune modification fournie'
  );
}

// ─── Authentification et PIN ─────────────────────────────────────────────────

// PIN: 4 à 8 chiffres uniquement (la politique de robustesse est dans lib/pinPolicy.js)
const pinSchema = z.string('Le code PIN doit être une chaîne de chiffres')
  .min(4, 'Le code PIN doit contenir au moins 4 chiffres')
  .max(8, 'Le code PIN doit contenir au maximum 8 chiffres')
  .regex(/^\d+$/, 'Le code PIN ne doit contenir que des chiffres');

// POST /auth/login
const loginSchema = z.object({
  profileId: numericIdSchema,
  pin: pinSchema
}).strict();

// POST /auth/family-gate
const familyGateCheckSchema = z.object({
  pin: pinSchema
}).strict();

// PUT /auth/family-gate
const familyGateUpdateSchema = z.object({
  newPin: pinSchema,
  currentPin: pinSchema.optional()
}).strict();

// POST /profiles/:id/pin (vérification)
const pinVerifySchema = z.object({
  pin: pinSchema
}).strict();

// PUT /profiles/:id/pin (modification)
const pinUpdateSchema = z.object({
  newPin: pinSchema,
  currentPin: pinSchema.optional()
}).strict();

// ─── Profils ─────────────────────────────────────────────────────────────────

const PROFILE_TYPES = ['child', 'teen', 'admin'];
// Image de profil encodée (data URL / base64, éventuellement chiffrée) : ~1,5 Mo d'image
const MAX_PROFILE_IMAGE_LENGTH = 2 * 1024 * 1024;

const profileFields = {
  name: z.string('Le nom est requis').trim().min(1, 'Le nom est requis').max(100, 'Le nom est trop long (100 caractères maximum)'),
  description: optionalText(5000),
  type: z.enum(PROFILE_TYPES, 'Type de profil invalide (child, teen ou admin)'),
  color: optionalText(50),
  avatar_class: optionalText(255),
  avatar_content: optionalText(20000),
  level: optionalText(50),
  image_url: optionalText(2048),
  image_data: z.string()
    .max(MAX_PROFILE_IMAGE_LENGTH, 'Image trop volumineuse (2 Mo maximum)')
    .nullable()
    .optional(),
  image_type: optionalText(50),
  is_active: booleanish.optional()
};

// POST /profiles : les indicateurs is_admin / is_child / is_teen sont déduits de `type`
const profileCreateSchema = z.object(profileFields);

// PUT /profiles/:id : mise à jour partielle
const profileUpdateSchema = nonEmptyUpdate(z.object(profileFields).partial());

// POST /profiles/requests (demande de création, validée par un parent)
const profileCreationRequestSchema = z.object({
  name: z.string('Nom invalide (2 à 40 caractères requis).')
    .transform(value => value.replace(/\r/g, '').trim())
    .pipe(z.string()
      .min(2, 'Nom invalide (2 à 40 caractères requis).')
      .max(40, 'Nom invalide (2 à 40 caractères requis).')
      // Lettres (unicode), chiffres, espace, tiret, apostrophes, underscore
      .regex(/^[\p{L}0-9 _'’-]+$/u, 'Nom invalide (caractères non autorisés).')),
  type: z.enum(['child', 'teen'], 'Type de profil invalide (child ou teen)').default('child')
});

// ─── Leçons et quiz ──────────────────────────────────────────────────────────

const MAX_QUIZ_QUESTIONS = 100;

const quizQuestionSchema = z.object({
  question: z.string('Chaque question doit avoir un énoncé').trim().min(1, 'Chaque question doit avoir un énoncé').max(2000),
  options: z.array(z.union([z.string().max(1000), z.number()]), 'Chaque question doit proposer des réponses')
    .min(2, 'Chaque question doit proposer au moins 2 réponses')
    .max(10, 'Une question propose au plus 10 réponses'),
  correctAnswer: z.number('correctAnswer doit être l\'index de la bonne réponse').int().min(0),
  explanation: optionalText(5000)
}).loose().refine(
  question => question.correctAnswer < question.options.length,
  { message: 'correctAnswer doit désigner une des réponses proposées', path: ['correctAnswer'] }
);

// quizData : objet ou chaîne JSON (anciens clients)
const quizDataSchema = z.preprocess(
  value => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch (_error) {
      return value;
    }
  },
  z.object({
    title: optionalText(255),
    description: optionalText(5000),
    questions: z.array(quizQuestionSchema, 'Le quiz doit contenir une liste de questions')
      .min(1, 'Le quiz doit contenir au moins une question')
      .max(MAX_QUIZ_QUESTIONS, `Le quiz contient au plus ${MAX_QUIZ_QUESTIONS} questions`)
  }, 'Données de quiz invalides').loose()
);

const lessonFields = {
  title: z.string('Le titre est requis').trim().min(1, 'Le titre est requis').max(255),
  description: optionalText(5000),
  subject: optionalText(100),
  level: optionalText(50),
  imageFilename: optionalText(255),
  quizData: quizDataSchema,
  isPublished: booleanish.optional(),
  targetProfileId: numericIdSchema.nullable().optional()
};

// POST /lessons
const lessonCreateSchema = z.object(lessonFields);

// PUT /lessons/:id
const lessonUpdateSchema = nonEmptyUpdate(z.object(lessonFields).partial());

// Filtre « publié » des listes : 'true' / 'false' / '1' / '0'
const publishedFilter = z.enum(['true', 'false', '1', '0'], 'Filtre published invalide')
  .transform(value => value === 'true' || value === '1')
  .optional();

// GET /lessons
const lessonListQuerySchema = z.object({
  profileId: numericIdSchema.optional(),
  targetProfileId: numericIdSchema.optional(),
  published: publishedFilter
});

// POST /lessons/:id/quiz-results : le score est recalculé par le serveur à partir de
// quiz_data ; seules les réponses choisies (index ou null) sont prises en compte.
const lessonQuizResultSchema = z.object({
  profileId: numericIdSchema,
  answers: z.array(
    z.number('Chaque réponse doit être un index ou null').int().min(0).max(99).nullable(),
    'answers doit être la liste des réponses choisies'
  ).max(MAX_QUIZ_QUESTIONS)
});

// ─── Pages de cours ──────────────────────────────────────────────────────────

// Pages de cours HTML (révision + quiz intégrés), publiées par un parent pour un enfant
const MAX_COURSE_PAGE_HTML_LENGTH = 5 * 1024 * 1024;

const coursePageCreateSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(255),
  subject: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  htmlContent: z.string()
    .min(1, 'Le contenu HTML est requis')
    .max(MAX_COURSE_PAGE_HTML_LENGTH, 'La page HTML est trop volumineuse (5 Mo maximum)'),
  targetProfileId: numericIdSchema,
  isPublished: z.boolean().optional()
});

// PUT /course-pages/:id : tous les champs sont optionnels (mise à jour partielle)
const coursePageUpdateSchema = coursePageCreateSchema.partial();

// POST /course-pages/preview : aperçu d'un brouillon non publié (parent)
const coursePagePreviewSchema = coursePageCreateSchema.pick({ htmlContent: true });

// GET /course-pages/render?t=<jeton d'affichage>
const coursePageRenderQuerySchema = z.object({
  t: z.string().min(1, 'Jeton d\'affichage manquant').max(2000)
});

// GET /course-pages
const coursePageListQuerySchema = z.object({
  targetProfileId: numericIdSchema.optional(),
  published: publishedFilter
});

// POST /course-pages/:id/results et PUT /course-pages/:id/results/:resultId
// Le quiz vit dans la page HTML générée : le score ne peut pas être recalculé.
const coursePageResultSchema = z.object({
  profileId: numericIdSchema,
  score: integer().pipe(z.number().min(0)),
  totalQuestions: integer().pipe(z.number().min(1).max(1000)),
  answers: boundedJson(20000, 'Réponses trop volumineuses').optional(),
  // false pour les sauvegardes intermédiaires ; absent = session terminée (anciens clients)
  completed: z.boolean().optional()
}).refine(
  result => result.score <= result.totalQuestions,
  { message: 'Le score ne peut pas dépasser le nombre de questions', path: ['score'] }
);

// ─── Notifications ───────────────────────────────────────────────────────────

const notificationListQuerySchema = z.object({
  profileId: numericIdSchema.optional(),
  isRead: z.enum(['true', 'false'], 'Filtre isRead invalide').transform(value => value === 'true').optional(),
  type: z.string().trim().min(1).max(50).optional()
});

const notificationCreateSchema = z.object({
  profileId: numericIdSchema,
  type: z.string('type requis').trim().min(1, 'type requis').max(50),
  title: z.string('title requis').trim().min(1, 'title requis').max(255),
  message: z.string('message requis').trim().min(1, 'message requis').max(5000),
  data: boundedJson(10000, 'data trop volumineux').optional()
});

const notificationUpdateSchema = z.object({
  isRead: booleanish
});

const markAllNotificationsReadSchema = z.object({
  profileId: numericIdSchema.optional()
});

// ─── Badges ──────────────────────────────────────────────────────────────────

const badgeFields = {
  name: z.string('Le nom est requis').trim().min(1, 'Le nom est requis').max(100),
  description: z.string('La description est requise').trim().min(1, 'La description est requise').max(2000),
  icon: z.string('L\'icône est requise').trim().min(1, 'L\'icône est requise').max(50),
  category: z.string('La catégorie est requise').trim().min(1, 'La catégorie est requise').max(50),
  // Seuls les critères que le service des badges sait évaluer (cf. lib/badgeConditions.js)
  condition_type: z.string('Le type de condition est requis').trim().min(1, 'Le type de condition est requis').max(50)
    .superRefine((conditionType, ctx) => {
      const support = getConditionSupport(conditionType);
      if (!support.supported) ctx.addIssue({ code: 'custom', message: support.reason });
    }),
  condition_value: integer().pipe(z.number().min(1, 'La valeur de condition doit être positive').max(1000000)),
  points: integer().pipe(z.number().min(0, 'Les points doivent être positifs ou nuls').max(1000000)),
  color: z.string('La couleur est requise').trim().min(1, 'La couleur est requise').max(50),
  is_active: booleanish
};

const badgeCreateSchema = z.object({
  ...badgeFields,
  is_active: booleanish.default(true)
});

const badgeUpdateSchema = nonEmptyUpdate(z.object(badgeFields).partial());

const badgeCheckUnlockSchema = z.object({
  profileId: numericIdSchema,
  actionType: z.string('actionType requis').trim().min(1, 'actionType requis').max(50),
  actionData: boundedJson(10000, 'actionData trop volumineux').optional()
});

const recentBadgesQuerySchema = z.object({
  limit: integer().pipe(z.number().min(1, 'limit doit être compris entre 1 et 50').max(50, 'limit doit être compris entre 1 et 50')).default(5)
});

// ─── Activités ───────────────────────────────────────────────────────────────

const ACTIVITY_STATUSES = ['active', 'paused', 'completed', 'cancelled'];
const ACTIVITY_PRIORITIES = ['low', 'medium', 'high'];

const activityFields = {
  title: z.string({
    error: issue => (issue.input === undefined ? 'Le titre est requis' : 'Le champ title doit être une chaîne de caractères')
  }).trim().min(1, 'Le titre est requis').max(255, 'Le champ title est trop long (255 caractères maximum)'),
  description: z.string('Le champ description doit être une chaîne de caractères').trim().max(10000).nullable().transform(value => value ?? ''),
  child_id: z.preprocess(value => (value === '' ? null : value), numericIdSchema.nullable()),
  priority: z.enum(ACTIVITY_PRIORITIES, 'priority doit valoir low, medium ou high'),
  due_date: z.preprocess(value => (value === '' ? null : value), z.coerce.date('due_date n\'est pas une date valide').nullable()),
  status: z.enum(ACTIVITY_STATUSES, 'status doit valoir active, paused, completed ou cancelled'),
  type: textOrEmpty(50),
  difficulty_level: textOrEmpty(20),
  estimated_duration: integer().pipe(z.number().min(0, 'estimated_duration doit être un entier positif').max(10000, 'estimated_duration doit être un entier positif')),
  target_age_group: textOrEmpty(20),
  subject_area: textOrEmpty(100),
  is_active: booleanish
};

const ACTIVITY_ALIASES = {
  childId: 'child_id',
  dueDate: 'due_date',
  difficultyLevel: 'difficulty_level',
  estimatedDuration: 'estimated_duration',
  targetAgeGroup: 'target_age_group',
  subjectArea: 'subject_area',
  isActive: 'is_active'
};

// POST /activities : valeurs par défaut identiques aux anciens clients
const activityCreateSchema = withAliases(ACTIVITY_ALIASES, z.object({
  ...activityFields,
  description: activityFields.description.default(''),
  child_id: activityFields.child_id.default(null),
  priority: activityFields.priority.default('medium'),
  due_date: activityFields.due_date.default(null),
  status: activityFields.status.default('active'),
  type: textOrEmpty(50).transform(value => value || 'task').default('task'),
  difficulty_level: textOrEmpty(20).transform(value => value || 'medium').default('medium'),
  estimated_duration: activityFields.estimated_duration.default(30),
  target_age_group: textOrEmpty(20).transform(value => value || '6-12').default('6-12'),
  subject_area: textOrEmpty(100).transform(value => value || 'general').default('general'),
  is_active: activityFields.is_active.default(true)
}));

// PUT /activities/:id
const activityUpdateSchema = withAliases(ACTIVITY_ALIASES, nonEmptyUpdate(z.object(activityFields).partial()));

// GET /activities
const activityListQuerySchema = z.object({
  child_id: z.preprocess(value => (value === '' ? undefined : value), numericIdSchema.optional()),
  status: z.preprocess(value => (value === '' ? undefined : value), z.enum(ACTIVITY_STATUSES, 'status invalide').optional()),
  priority: z.preprocess(value => (value === '' ? undefined : value), z.enum(ACTIVITY_PRIORITIES, 'priority invalide').optional()),
  search: z.string().trim().max(200).optional()
});

// ─── Vidéos YouTube ──────────────────────────────────────────────────────────

const youtubeFields = {
  url: z.string('Le champ url doit être une chaîne de caractères').trim().min(1, 'URL, video_id et titre sont requis').max(2048, 'Le champ url est trop long (2048 caractères maximum)'),
  video_id: z.string('Le champ video_id doit être une chaîne de caractères').trim().min(1, 'URL, video_id et titre sont requis').max(64, 'Le champ video_id est trop long (64 caractères maximum)'),
  title: z.string('Le champ title doit être une chaîne de caractères').trim().min(1, 'URL, video_id et titre sont requis').max(255, 'Le champ title est trop long (255 caractères maximum)'),
  description: z.string('Le champ description doit être une chaîne de caractères').trim().max(5000).nullable().transform(value => value ?? ''),
  category: textOrEmpty(100),
  age_group: textOrEmpty(50),
  is_active: booleanish
};

const YOUTUBE_ALIASES = {
  videoId: 'video_id',
  ageGroup: 'age_group',
  isActive: 'is_active'
};

const youtubeVideoCreateSchema = withAliases(YOUTUBE_ALIASES, z.object({
  ...youtubeFields,
  description: youtubeFields.description.default(''),
  category: youtubeFields.category.transform(value => value || 'general').default('general'),
  age_group: youtubeFields.age_group.transform(value => value || '6-12').default('6-12'),
  is_active: youtubeFields.is_active.default(true)
}));

const youtubeVideoUpdateSchema = withAliases(YOUTUBE_ALIASES, nonEmptyUpdate(z.object(youtubeFields).partial()));

// ─── Journal d'audit ─────────────────────────────────────────────────────────

const AUDIT_LEVELS = ['info', 'warning', 'error', 'critical'];
const AUDIT_CATEGORIES = ['authentication', 'authorization', 'data_access', 'security', 'api_usage', 'system'];

// Actions que le frontend peut journaliser. Les événements sensibles (connexions,
// verrouillages, quiz terminés) sont journalisés par le serveur lui-même et ne
// peuvent pas être envoyés par un client.
const CLIENT_AUDIT_ACTIONS = [
  'CLIENT_ERROR',
  'SYSTEM_ERROR',
  'SECURITY_VIOLATION',
  'PROFILE_CREATED',
  'PROFILE_UPDATED',
  'LESSON_CREATED',
  'LESSON_DELETED',
  'NOTIFICATION_CREATED',
  'IMAGE_UPLOADED',
  'QUIZ_GENERATION_START',
  'QUIZ_GENERATION_SUCCESS',
  'QUIZ_GENERATION_FAILED',
  'API_REQUEST_SUCCESS',
  'API_REQUEST_FAILED'
];

// POST /audit/logs : userId, ipAddress et userAgent envoyés par le client sont ignorés
// (dérivés du jeton et de la requête par le serveur).
const auditLogCreateSchema = z.object({
  action: z.enum(CLIENT_AUDIT_ACTIONS, 'Action non autorisée'),
  category: z.enum(AUDIT_CATEGORIES, 'Category invalide'),
  level: z.enum(AUDIT_LEVELS).catch('info').default('info'),
  details: z.unknown().optional()
});

// GET /audit/logs
const auditLogsQuerySchema = z.object({
  userId: numericIdSchema.optional(),
  category: z.enum(AUDIT_CATEGORIES, 'category invalide').optional(),
  level: z.enum(AUDIT_LEVELS, 'level invalide').optional(),
  limit: integer().pipe(z.number().min(1, 'limit doit être compris entre 1 et 500').max(500, 'limit doit être compris entre 1 et 500')).default(100),
  offset: integer().pipe(z.number().min(0, 'offset invalide').max(1000000, 'offset invalide')).default(0)
});

// GET /audit/stats
const auditStatsQuerySchema = z.object({
  days: integer().pipe(z.number().min(1, 'days doit être compris entre 1 et 365').max(365, 'days doit être compris entre 1 et 365')).default(7)
});

// POST /audit/export
const auditExportSchema = z.object({
  filters: z.object({
    userId: numericIdSchema.optional(),
    category: z.enum(AUDIT_CATEGORIES, 'category invalide').optional(),
    level: z.enum(AUDIT_LEVELS, 'level invalide').optional(),
    startDate: z.coerce.date('startDate n\'est pas une date valide').optional(),
    endDate: z.coerce.date('endDate n\'est pas une date valide').optional()
  }).default({})
});

module.exports = {
  numericIdSchema,
  pinSchema,
  loginSchema,
  familyGateCheckSchema,
  familyGateUpdateSchema,
  pinVerifySchema,
  pinUpdateSchema,
  PROFILE_TYPES,
  MAX_PROFILE_IMAGE_LENGTH,
  profileCreateSchema,
  profileUpdateSchema,
  profileCreationRequestSchema,
  quizDataSchema,
  lessonCreateSchema,
  lessonUpdateSchema,
  lessonListQuerySchema,
  lessonQuizResultSchema,
  MAX_COURSE_PAGE_HTML_LENGTH,
  coursePageCreateSchema,
  coursePageUpdateSchema,
  coursePagePreviewSchema,
  coursePageRenderQuerySchema,
  coursePageListQuerySchema,
  coursePageResultSchema,
  notificationListQuerySchema,
  notificationCreateSchema,
  notificationUpdateSchema,
  markAllNotificationsReadSchema,
  badgeCreateSchema,
  badgeUpdateSchema,
  badgeCheckUnlockSchema,
  recentBadgesQuerySchema,
  ACTIVITY_STATUSES,
  ACTIVITY_PRIORITIES,
  activityCreateSchema,
  activityUpdateSchema,
  activityListQuerySchema,
  youtubeVideoCreateSchema,
  youtubeVideoUpdateSchema,
  AUDIT_LEVELS,
  AUDIT_CATEGORIES,
  CLIENT_AUDIT_ACTIONS,
  auditLogCreateSchema,
  auditLogsQuerySchema,
  auditStatsQuerySchema,
  auditExportSchema
};
