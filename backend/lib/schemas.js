/**
 * Schémas Zod pour les endpoints sensibles.
 * Centralise les règles de validation des entrées API.
 */
const { z } = require('zod');

// PIN: 4 à 8 chiffres uniquement
const pinSchema = z.string()
  .min(4, 'Le code PIN doit contenir au moins 4 chiffres')
  .max(8, 'Le code PIN doit contenir au maximum 8 chiffres')
  .regex(/^\d+$/, 'Le code PIN ne doit contenir que des chiffres');

// ID numérique (accepte string ou number, coerce vers number)
const numericIdSchema = z.coerce.number().int().positive();

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

// POST /profiles/requests (demande de création)
// Garde permissif sur les champs descriptifs, strict sur les types/longueurs
const profileCreationRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(['child', 'teen', 'admin']).optional(),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  level: z.string().max(50).optional().nullable(),
  pin: pinSchema.optional(),
  requesterEmail: z.string().email().optional().nullable()
}).passthrough();

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

module.exports = {
  pinSchema,
  loginSchema,
  familyGateCheckSchema,
  familyGateUpdateSchema,
  pinVerifySchema,
  pinUpdateSchema,
  profileCreationRequestSchema,
  coursePageCreateSchema,
  coursePageUpdateSchema,
  MAX_COURSE_PAGE_HTML_LENGTH
};
