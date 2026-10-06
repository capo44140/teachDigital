const jwt = require('jsonwebtoken');
const sql = require('./database.js').default;
const { withQueryTimeout, TIMEOUTS } = require('./queries.js');

// NB : ne pas faire « await sql`...` » directement. sql renvoie une Promise native dont
// seul le then() surchargé lance la requête ; await l'ignore et attendrait indéfiniment.
// withQueryTimeout (Promise.race) appelle bien ce then(), comme dans les contrôleurs.

function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (raw === undefined || raw === null) return '';
  if (typeof raw !== 'string') return String(raw);
  // Protéger contre CRLF dans les fichiers env (ex: "secret\r")
  return raw.replace(/\r/g, '').trim();
}

// Middleware d'authentification pour Vercel Functions
function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Token manquant');
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return decoded;
  } catch (error) {
    throw new Error('Token invalide');
  }
}

// Générer un token JWT
function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

// Vérifier une session en base de données
async function verifySession(sessionToken) {
  try {
    const sessions = await withQueryTimeout(
      sql`
        SELECT s.*, p.name, p.type, p.is_admin, p.is_child, p.is_teen
        FROM sessions s
        JOIN profiles p ON s.profile_id = p.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > CURRENT_TIMESTAMP
      `,
      TIMEOUTS.STANDARD,
      'vérification de la session'
    );
    return sessions[0] || null;
  } catch (error) {
    console.error('Erreur lors de la vérification de la session:', error);
    throw error;
  }
}

// Créer une session
async function createSession(profileId, sessionToken, expiresAt) {
  try {
    const result = await withQueryTimeout(
      sql`
        INSERT INTO sessions (profile_id, session_token, expires_at)
        VALUES (${profileId}, ${sessionToken}, ${expiresAt})
        RETURNING *
      `,
      TIMEOUTS.STANDARD,
      'création de la session'
    );
    return result[0];
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    throw error;
  }
}

// Supprimer une session
async function deleteSession(sessionToken) {
  try {
    const result = await withQueryTimeout(
      sql`
        DELETE FROM sessions
        WHERE session_token = ${sessionToken}
        RETURNING *
      `,
      TIMEOUTS.STANDARD,
      'suppression de la session'
    );
    return result[0];
  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error);
    throw error;
  }
}

// Authentifier un utilisateur (supporte JWT et Session Token)
async function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Token manquant');
  }

  // 1. Essayer JWT (rapide, synchrone)
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return decoded;
  } catch (jwtError) {
    // 2. Si JWT échoue, essayer Session Token (DB, asynchrone)
    try {
      const session = await verifySession(token);
      if (session) {
        // Adapter le format de session au format utilisateur attendu
        return {
          id: session.profile_id,
          name: session.name,
          type: session.type,
          isAdmin: session.is_admin,
          isChild: session.is_child,
          isTeen: session.is_teen,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(new Date(session.expires_at).getTime() / 1000)
        };
      }
    } catch (sessionError) {
      // Ignorer l'erreur de session pour retourner l'erreur d'auth principale
    }

    throw new Error('Token invalide ou session expirée');
  }
}

module.exports = {
  authenticateToken,
  authenticateUser,
  generateToken,
  verifySession,
  createSession,
  deleteSession
};

