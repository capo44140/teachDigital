import bcrypt from 'bcryptjs';
import sql from '../../lib/database.js';
import { generateToken, createSession } from '../../lib/auth.js';
import { successResponse, errorResponse, unauthorizedResponse, handleError } from '../../lib/response.js';
import { handleCors } from '../../lib/cors.js';

export default async function handler(req, res) {
  // Gestion CORS
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const { profileId, pin } = req.body;

    // Validation des données
    if (!profileId || !pin) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de profil et code PIN requis' 
      });
      return;
    }

    // Récupérer le profil et le code PIN
    const [profile, pinData] = await Promise.all([
      sql`SELECT * FROM profiles WHERE id = ${profileId} AND is_active = true`,
      sql`SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1`
    ]);

    if (!profile[0] || !pinData[0]) {
      res.status(401).json({ 
        success: false, 
        message: 'Profil ou code PIN invalide' 
      });
      return;
    }

    // Vérifier le code PIN
    const isValidPin = await bcrypt.compare(pin, pinData[0].pin_code);
    if (!isValidPin) {
      res.status(401).json({ 
        success: false, 
        message: 'Code PIN incorrect' 
      });
      return;
    }

    // Générer le token JWT
    const tokenPayload = {
      profileId: profile[0].id,
      name: profile[0].name,
      type: profile[0].type,
      isAdmin: profile[0].is_admin
    };
    
    const token = generateToken(tokenPayload);

    // Créer une session en base
    const sessionToken = generateToken({ profileId: profile[0].id });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await createSession(profile[0].id, sessionToken, expiresAt);

    // Réponse de succès
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        profile: {
          id: profile[0].id,
          name: profile[0].name,
          type: profile[0].type,
          isAdmin: profile[0].is_admin,
          isChild: profile[0].is_child,
          isTeen: profile[0].is_teen
        }
      }
    });

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la connexion');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

