const jwt = require('jsonwebtoken');
const sql = require('./database.js').default;
const { withQueryTimeout, TIMEOUTS } = require('./queries.js');
const { createErrorResponse } = require('./response.js');

// Deux types de jetons :
// - « family » : délivré par le code d'entrée familial. Donne l'accès « enfant »
//   (lire les leçons, enregistrer les résultats d'un enfant, etc.).
// - « profile » : délivré par le PIN d'un profil (/auth/login). Un jeton profil
//   admin est exigé pour toutes les actions parent ; le statut admin est revérifié en base.
const TOKEN_SCOPES = {
  FAMILY: 'family',
  PROFILE: 'profile'
};

const FAMILY_TOKEN_EXPIRES_IN = process.env.JWT_FAMILY_EXPIRES_IN || '24h';
const PROFILE_TOKEN_EXPIRES_IN = process.env.JWT_PROFILE_EXPIRES_IN || '4h';

// Valeurs d'exemple publiées dans le dépôt : ne doivent jamais servir de secret réel
const KNOWN_EXAMPLE_SECRETS = new Set([
  'teachdigital-super-secret-jwt-key-2024-change-in-production',
  'change_me_jwt_secret_please',
  'your-super-secret-jwt-key-change-in-production',
  'test-secret-key-for-jest-tests-only'
]);
const MIN_JWT_SECRET_LENGTH = 32;

function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (raw === undefined || raw === null) return '';
  if (typeof raw !== 'string') return String(raw);
  // Protéger contre CRLF dans les fichiers env (ex: "secret\r")
  return raw.replace(/\r/g, '').trim();
}

// Renvoie un message d'erreur si le secret JWT n'est pas utilisable en production, sinon null
function getJwtSecretProblem() {
  const secret = getJwtSecret();
  if (!secret) return 'JWT_SECRET manquant';
  if (secret.length < MIN_JWT_SECRET_LENGTH) return `JWT_SECRET trop court (minimum ${MIN_JWT_SECRET_LENGTH} caractères)`;
  if (KNOWN_EXAMPLE_SECRETS.has(secret)) return 'JWT_SECRET est une valeur d\'exemple publique';
  return null;
}

function extractBearerToken(req) {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (!/^Bearer$/i.test(scheme || '') || !token) return null;
  return token;
}

// Décode et vérifie le jeton de la requête. Lève 'Token manquant' / 'Token invalide'.
function authenticateToken(req) {
  const token = extractBearerToken(req);

  if (!token) {
    throw new Error('Token manquant');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  } catch (error) {
    throw new Error('Token invalide');
  }

  // Jetons émis avant l'introduction des scopes : ce sont des jetons profil
  if (!decoded.scope && decoded.profileId) {
    decoded.scope = TOKEN_SCOPES.PROFILE;
  }
  if (decoded.scope !== TOKEN_SCOPES.FAMILY && decoded.scope !== TOKEN_SCOPES.PROFILE) {
    throw new Error('Token invalide');
  }
  if (decoded.scope === TOKEN_SCOPES.FAMILY) {
    // Un jeton famille ne porte jamais de droits admin
    decoded.isAdmin = false;
    delete decoded.profileId;
  }
  return decoded;
}

// Générer un jeton profil (après vérification du PIN)
function generateToken(payload) {
  return jwt.sign(
    { ...payload, scope: TOKEN_SCOPES.PROFILE },
    getJwtSecret(),
    { expiresIn: PROFILE_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
  );
}

// Générer un jeton famille (après vérification du code d'entrée familial)
function generateFamilyToken() {
  const token = jwt.sign(
    { scope: TOKEN_SCOPES.FAMILY },
    getJwtSecret(),
    { expiresIn: FAMILY_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
  );
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

function sendUnauthorized(res, message) {
  res.status(401).json(createErrorResponse(message || 'Authentification requise', 'UNAUTHORIZED'));
}

function sendForbidden(res, message) {
  res.status(403).json(createErrorResponse(message || 'Accès refusé - Admin requis', 'FORBIDDEN'));
}

// Middleware : jeton famille ou profil valide requis. Renseigne req.user.
function requireMember(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  try {
    req.user = authenticateToken(req);
    return next();
  } catch (error) {
    return sendUnauthorized(res, error.message);
  }
}

// Vérifie en base que le profil existe, est actif et admin (révocation immédiate
// si un parent est désactivé ou rétrogradé, sans attendre l'expiration du jeton).
async function isActiveAdminProfile(profileId) {
  const id = parseInt(profileId, 10);
  if (!Number.isInteger(id) || id <= 0) return false;
  const rows = await withQueryTimeout(
    sql`SELECT is_admin, is_active FROM profiles WHERE id = ${id}`,
    TIMEOUTS.FAST,
    'vérification des droits admin'
  );
  return !!rows[0] && rows[0].is_admin === true && rows[0].is_active !== false;
}

// Middleware : jeton profil d'un parent (admin) requis. Renseigne req.user.
async function requireAdmin(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  let user;
  try {
    user = authenticateToken(req);
  } catch (error) {
    return sendUnauthorized(res, error.message);
  }
  if (user.scope !== TOKEN_SCOPES.PROFILE || !user.isAdmin) {
    return sendForbidden(res);
  }
  try {
    if (!(await isActiveAdminProfile(user.profileId))) {
      return sendForbidden(res);
    }
  } catch (error) {
    return res.status(503).json(createErrorResponse('Vérification des droits impossible. Veuillez réessayer.', 'SERVICE_UNAVAILABLE'));
  }
  req.user = { ...user, isAdmin: true };
  return next();
}

// Middleware conditionnel : lecture (GET/HEAD) pour tout membre, écriture réservée aux parents
function requireAdminForWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return requireMember(req, res, next);
  }
  return requireAdmin(req, res, next);
}

// Un utilisateur peut-il agir pour ce profil (enregistrer un résultat, lire sa progression) ?
// - parent (jeton admin) : tous les profils
// - jeton famille : tous les profils (l'appareil familial a passé le code d'entrée)
// - jeton profil non admin : uniquement le sien
function canActForProfile(user, profileId) {
  if (!user) return false;
  if (user.isAdmin === true && user.scope === TOKEN_SCOPES.PROFILE) return true;
  if (user.scope === TOKEN_SCOPES.FAMILY) return true;
  return String(user.profileId) === String(profileId);
}

module.exports = {
  TOKEN_SCOPES,
  getJwtSecret,
  getJwtSecretProblem,
  authenticateToken,
  generateToken,
  generateFamilyToken,
  requireMember,
  requireAdmin,
  requireAdminForWrites,
  canActForProfile,
  isActiveAdminProfile
};
