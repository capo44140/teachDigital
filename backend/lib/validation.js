/**
 * Middleware de validation Zod pour les routes Express.
 *
 * Usage :
 *   router.post('/auth/login', validate(loginSchema), handleLogin);
 *
 * En cas d'échec, retourne 400 avec la liste des erreurs et n'appelle pas le handler.
 */
const { ZodError } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const target = req[source];
      const parsed = schema.parse(target);
      // Remplace par la valeur parsée (les coercions Zod prennent effet : trim, defaults, etc.)
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map(issue => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          code: 'VALIDATION_ERROR',
          errors: issues
        });
      }
      next(error);
    }
  };
}

module.exports = { validate };
