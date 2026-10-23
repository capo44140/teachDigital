const jwt = require('jsonwebtoken');
const sql = require('./database.js').default;
const { withQueryTimeout, TIMEOUTS } = require('./queries.js');
const { createErrorResponse } = require('./response.js');

// Deux types de jetons :
// - « family » : délivré par le code d'entrée familial. Donne l'accès « enfant »
//   (lire les leçons, enregistrer les résultats d'un enfant, etc.) pour les profils
//   NON admin uniquement.
// - « profile » : délivré par le PIN d'un profil (/auth/login). Un jeton profil
//   admin est exigé pour toutes les actions parent ; le statut admin est revérifié en base.
//
// Révocation : chaque jeton porte une version (claim `tokenVersion`) comparée à
// profiles.token_version (jeton profil) ou family_gate.token_version (jeton famille).
// Changer le code familial, le PIN, le type ou désactiver un profil incrémente la
// version : les jetons déjà émis sont refusés. Un jeton sans claim (émis avant la
// migration 0100) vaut la version 0.
const TOKEN_SCOPES = {
  FAMILY: 'family',
  PROFILE: 'profile'
};

const FAMILY_TOKEN_EXPIRES_IN = process.env.JWT_FAMILY_EXPIRES_IN || '24h';
const PROFILE_TOKEN_EXPIRES_IN = process.env.JWT_PROFILE_EXPIRES_IN || '4h';

// Cache des informations de révocation : évite une requête SQL par appel API.
// Invalidé immédiatement par les changements faits via l'API (clearAuthCache).
const AUTH_CACHE_TTL_MS = parseInt(process.env.AUTH_CACHE_TTL_MS || '30000', 10);
const AUTH_CACHE_MAX_ENTRIES = 1000;

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

function toPositiveInt(value) {
  const id = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeVersion(value) {
  const version = Number(value);
  return Number.isSafeInteger(version) && version >= 0 ? version : 0;
}

function extractBearerToken(req) {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (!/^Bearer$/i.test(scheme || '') || !token) return null;
  return token;
}

// Décode et vérifie la signature du jeton de la requête (synchrone, sans base).
// Lève 'Token manquant' / 'Token invalide'. La révocation est vérifiée par
// requireMember / requireAdmin / verifyRequestToken.
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
  // Jetons émis avant la révocation : version 0
  decoded.tokenVersion = normalizeVersion(decoded.tokenVersion);
  return decoded;
}

// Générer un jeton profil (après vérification du PIN).
// payload.tokenVersion = profiles.token_version au moment de la connexion.
function generateToken(payload) {
  return jwt.sign(
    { ...payload, tokenVersion: normalizeVersion(payload?.tokenVersion), scope: TOKEN_SCOPES.PROFILE },
    getJwtSecret(),
    { expiresIn: PROFILE_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
  );
}

// Générer un jeton famille (après vérification du code d'entrée familial).
// tokenVersion = family_gate.token_version au moment de l'émission.
function generateFamilyToken(tokenVersion = 0) {
  const token = jwt.sign(
    { scope: TOKEN_SCOPES.FAMILY, tokenVersion: normalizeVersion(tokenVersion) },
    getJwtSecret(),
    { expiresIn: FAMILY_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
  );
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

// ─── Cache de révocation ──────────────────────────────────────────────────────

const authCache = new Map(); // clé -> { value, expiresAt }

function cacheGet(key) {
  const entry = authCache.get(key);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    authCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key, value) {
  if (AUTH_CACHE_TTL_MS <= 0) return;
  if (authCache.size >= AUTH_CACHE_MAX_ENTRIES) authCache.clear();
  authCache.set(key, { value, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

// Oublie les informations d'un profil (profileId) ou du code familial ('family') ;
// sans argument, vide tout le cache.
function clearAuthCache(target) {
  if (target === undefined) {
    authCache.clear();
  } else if (target === 'family') {
    authCache.delete('family');
  } else {
    authCache.delete(`profile:${toPositiveInt(target)}`);
  }
}

// { id, isAdmin, isActive, tokenVersion } ou null si le profil n'existe pas (mis en cache ~30 s)
async function getProfileAuthInfo(profileId) {
  const id = toPositiveInt(profileId);
  if (!id) return null;
  const key = `profile:${id}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const rows = await withQueryTimeout(
    sql`SELECT is_admin, is_active, token_version FROM profiles WHERE id = ${id}`,
    TIMEOUTS.FAST,
    'vérification du profil'
  );
  const row = rows?.[0];
  const info = row
    ? { id, isAdmin: row.is_admin === true, isActive: row.is_active !== false, tokenVersion: normalizeVersion(row.token_version) }
    : null;
  cacheSet(key, info);
  return info;
}

// Version courante des jetons famille, ou null si le code familial n'est pas configuré
async function getFamilyTokenVersion() {
  const cached = cacheGet('family');
  if (cached !== undefined) return cached;

  const rows = await withQueryTimeout(
    sql`SELECT token_version FROM family_gate WHERE id = 1`,
    TIMEOUTS.FAST,
    'vérification du code familial'
  );
  const version = rows?.[0] ? normalizeVersion(rows[0].token_version) : null;
  cacheSet('family', version);
  return version;
}

// Vérifie qu'un jeton décodé n'est pas révoqué. Renvoie l'utilisateur (isAdmin
// confirmé en base pour un jeton profil) ou null si le jeton est révoqué.
// Lève en cas d'erreur base.
async function resolveTokenUser(decoded) {
  if (decoded.scope === TOKEN_SCOPES.FAMILY) {
    const version = await getFamilyTokenVersion();
    if (version === null || decoded.tokenVersion !== version) return null;
    return decoded;
  }
  const info = await getProfileAuthInfo(decoded.profileId);
  if (!info || !info.isActive || decoded.tokenVersion !== info.tokenVersion) return null;
  return { ...decoded, isAdmin: decoded.isAdmin === true && info.isAdmin };
}

function sendForbidden(res, message) {
  res.status(403).json(createErrorResponse(message || 'Accès refusé - Admin requis', 'FORBIDDEN'));
}

const REVOKED_MESSAGE = 'Session expirée ou révoquée. Veuillez vous reconnecter.';

/**
 * Authentifie la requête (signature + révocation).
 * Renvoie { user } ou { status, code, message } en cas de refus.
 */
async function verifyRequestToken(req) {
  let decoded;
  try {
    decoded = authenticateToken(req);
  } catch (error) {
    return { status: 401, code: 'UNAUTHORIZED', message: error.message };
  }
  let user;
  try {
    user = await resolveTokenUser(decoded);
  } catch (error) {
    console.error('❌ Vérification du jeton impossible:', error?.message || error);
    return { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Vérification des droits impossible. Veuillez réessayer.' };
  }
  if (!user) {
    return { status: 401, code: 'TOKEN_REVOKED', message: REVOKED_MESSAGE };
  }
  return { user };
}

function sendAuthFailure(res, failure) {
  res.status(failure.status).json(createErrorResponse(failure.message, failure.code));
}

// Middleware : jeton famille ou profil valide (et non révoqué) requis. Renseigne req.user.
async function requireMember(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const result = await verifyRequestToken(req);
  if (!result.user) return sendAuthFailure(res, result);
  req.user = result.user;
  return next();
}

// Le profil existe, est actif et admin (cache ~30 s, invalidé par les changements via l'API)
async function isActiveAdminProfile(profileId) {
  const info = await getProfileAuthInfo(profileId);
  return !!info && info.isAdmin === true && info.isActive === true;
}

// Middleware : jeton profil d'un parent (admin) requis. Renseigne req.user.
async function requireAdmin(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const result = await verifyRequestToken(req);
  if (!result.user) return sendAuthFailure(res, result);
  const user = result.user;
  // resolveTokenUser a confirmé en base le statut admin et actif du profil
  if (user.scope !== TOKEN_SCOPES.PROFILE || user.isAdmin !== true) {
    return sendForbidden(res);
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

function isAdminUser(user) {
  return !!user && user.scope === TOKEN_SCOPES.PROFILE && user.isAdmin === true;
}

/**
 * Un utilisateur peut-il agir pour ce profil (lire ses données, enregistrer un résultat) ?
 * - parent (jeton profil admin) : tous les profils ;
 * - jeton famille : tous les profils NON admin et actifs (jamais les données d'un parent) ;
 * - jeton profil non admin : uniquement le sien.
 * Asynchrone (le statut admin de la cible est lu en base, avec cache). Ne rejette
 * jamais : en cas d'erreur, l'accès est refusé.
 */
async function canActForProfile(user, profileId) {
  try {
    const id = toPositiveInt(profileId);
    if (!user || !id) return false;
    if (isAdminUser(user)) return true;
    if (user.scope === TOKEN_SCOPES.PROFILE) return toPositiveInt(user.profileId) === id;
    if (user.scope === TOKEN_SCOPES.FAMILY) {
      // Profil enfant actif uniquement : désactiver un enfant coupe aussi l'accès par l'appareil familial
      const info = await getProfileAuthInfo(id);
      return !!info && info.isAdmin !== true && info.isActive === true;
    }
    return false;
  } catch (error) {
    console.error('❌ Vérification d\'accès au profil impossible:', error?.message || error);
    return false;
  }
}

module.exports = {
  TOKEN_SCOPES,
  getJwtSecret,
  getJwtSecretProblem,
  authenticateToken,
  verifyRequestToken,
  generateToken,
  generateFamilyToken,
  requireMember,
  requireAdmin,
  requireAdminForWrites,
  isAdminUser,
  canActForProfile,
  isActiveAdminProfile,
  getProfileAuthInfo,
  getFamilyTokenVersion,
  clearAuthCache
};
