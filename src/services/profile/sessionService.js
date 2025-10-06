import sql from '../../config/database.js';

/**
 * Service pour la gestion des sessions
 * Gère la création, vérification et suppression des sessions utilisateur
 */
export class SessionService {
  
  // Créer une session
  static async createSession(profileId, sessionToken, expiresAt) {
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
  
  // Vérifier une session
  static async verifySession(sessionToken) {
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
  
  // Supprimer une session
  static async deleteSession(sessionToken) {
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
  
  // Nettoyer les sessions expirées
  static async cleanExpiredSessions() {
    try {
      const result = await sql`
        DELETE FROM sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
      `;
      return result;
    } catch (error) {
      console.error('Erreur lors du nettoyage des sessions:', error);
      throw error;
    }
  }
}
