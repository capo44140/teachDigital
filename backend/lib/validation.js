/**
 * Middleware de validation Zod pour les routes Express.
 *
 * Usage :
 *   router.post('/auth/login', validate(loginSchema), handleLogin);
 *   router.get('/lessons', validate(lessonListQuerySchema, 'query'), handleLessons);
 *
 * En cas d'échec, retourne 400 avec la liste des erreurs et n'appelle pas le handler.
 * Une entrée invalide ne doit jamais provoquer de 500.
 */
const { ZodError } = require('zod');

function formatZodIssues(error) {
  return error.issues.map(issue => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message
  }));
}

// Corps de réponse 400 : le premier message (en français, voir lib/schemas.js) est repris
// dans `message`, affiché par le frontend ; le détail par champ est dans `errors`.
function validationErrorBody(error) {
  const errors = formatZodIssues(error);
  return {
    success: false,
    message: errors[0]?.message || 'Données invalides',
    code: 'VALIDATION_ERROR',
    data: null,
    errors
  };
}

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const target = req[source] ?? {};
      // Remplace par la valeur parsée (les coercions Zod prennent effet : trim, defaults, etc.)
      req[source] = schema.parse(target);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(validationErrorBody(error));
      }
      next(error);
    }
  };
}

module.exports = { validate, validationErrorBody };
