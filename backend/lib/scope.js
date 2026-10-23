/**
 * Isolation des données par profil : règle unique pour toutes les routes.
 *
 * - parent (jeton profil admin) : tout ;
 * - jeton famille (appareil partagé, l'enfant choisit son profil sans PIN) :
 *   les profils NON admin et actifs, jamais les données d'un parent ;
 * - jeton profil non admin : uniquement le sien.
 *
 * Les contenus « ciblés » (leçons, pages de cours, activités) portent un profil
 * cible ; NULL signifie « tous les enfants » quand la colonne le permet.
 */
const { TOKEN_SCOPES, canActForProfile, isAdminUser } = require('./auth.js');
const { createErrorResponse } = require('./response.js');
const { parseId } = require('./http.js');

// Résumé des droits de l'utilisateur : { kind: 'admin' | 'family' | 'profile' | 'none', isAdmin, profileId }
function scopeForUser(user) {
  if (isAdminUser(user)) {
    return { kind: 'admin', isAdmin: true, profileId: parseId(user.profileId) };
  }
  if (user?.scope === TOKEN_SCOPES.PROFILE) {
    return { kind: 'profile', isAdmin: false, profileId: parseId(user.profileId) };
  }
  if (user?.scope === TOKEN_SCOPES.FAMILY) {
    return { kind: 'family', isAdmin: false, profileId: null };
  }
  return { kind: 'none', isAdmin: false, profileId: null };
}

// L'utilisateur peut-il lire / agir pour ce profil ? (asynchrone, ne rejette jamais)
const canAccessProfile = canActForProfile;

/**
 * Condition SQL limitant `column` (profil cible) aux profils visibles par l'utilisateur.
 * Renvoie null pour un parent (aucune restriction). Ajoute ses paramètres à `params`.
 * includeUntargeted : NULL (contenu destiné à tous les enfants) est visible.
 */
function visibleProfileCondition(user, column, params, { includeUntargeted = true } = {}) {
  const scope = scopeForUser(user);
  if (scope.isAdmin) return null;
  const untargeted = includeUntargeted ? `${column} IS NULL OR ` : '';
  if (scope.kind === 'profile' && scope.profileId) {
    params.push(scope.profileId);
    return `(${untargeted}${column} = $${params.length})`;
  }
  if (scope.kind === 'family') {
    return `(${untargeted}${column} IN (SELECT id FROM profiles WHERE is_admin = false AND COALESCE(is_active, true)))`;
  }
  return 'FALSE';
}

// Middleware : le profil désigné par req.params[param] doit être accessible à req.user
function requireProfileAccess(param = 'id') {
  return async function profileAccessMiddleware(req, res, next) {
    const profileId = parseId(req.params?.[param]);
    if (!profileId) {
      return res.status(400).json(createErrorResponse('ID de profil invalide', 'BAD_REQUEST'));
    }
    if (!(await canAccessProfile(req.user, profileId))) {
      return res.status(403).json(createErrorResponse('Accès refusé', 'FORBIDDEN'));
    }
    return next();
  };
}

module.exports = {
  scopeForUser,
  canAccessProfile,
  visibleProfileCondition,
  requireProfileAccess
};
