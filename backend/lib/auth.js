import jwt from 'jsonwebtoken';
import sql from './database.js';

// Middleware d'authentification pour Vercel Functions
export function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Token manquant');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Token invalide');
  }
}

// Générer un token JWT
export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

// Vérifier une session en base de données
export async function verifySession(sessionToken) {
  try {
    const sessions = await sql`
      SELECT s.*, p.name, p.type, p.is_admin, p.is_child, p.is_teen
      FROM sessions s
      JOIN profiles p ON s.profile_id = p.id
      WHERE s.session_token = ${sessionToken}
      AND s.expires_at > CURRENT_TIMESTAMP
    `;
    return sessions[0] || null;
  } catch (error) {
    console.error('Erreur lors de la vérification de la session:', error);
    throw error;
  }
}

// Créer une session
export async function createSession(profileId, sessionToken, expiresAt) {
  try {
    const result = await sql`
      INSERT INTO sessions (profile_id, session_token, expires_at)
      VALUES (${profileId}, ${sessionToken}, ${expiresAt})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    throw error;
  }
}

// Supprimer une session
export async function deleteSession(sessionToken) {
  try {
    const result = await sql`
      DELETE FROM sessions 
      WHERE session_token = ${sessionToken}
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error);
    throw error;
  }
}

