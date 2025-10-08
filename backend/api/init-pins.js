import bcrypt from 'bcryptjs';
import sql from '../../lib/database.js';
import { handleCors } from '../../lib/cors.js';
import { successResponse, errorResponse, handleError } from '../../lib/response.js';

export default async function handler(req, res) {
  // Gestion CORS
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    console.log('🔐 Initialisation des codes PIN par défaut...');

    // Vérifier les profils existants
    const profiles = await sql`
      SELECT id, name, type
      FROM profiles 
      ORDER BY id
    `;

    if (profiles.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Aucun profil trouvé'
      });
      return;
    }

    // Code PIN par défaut
    const defaultPin = '1234';
    const saltRounds = 12;
    const hashedPin = await bcrypt.hash(defaultPin, saltRounds);

    let createdCount = 0;
    let existingCount = 0;

    // Initialiser les codes PIN pour tous les profils
    for (const profile of profiles) {
      try {
        // Vérifier si le profil a déjà un code PIN
        const existingPin = await sql`
          SELECT id FROM pin_codes WHERE profile_id = ${profile.id}
        `;

        if (existingPin.length === 0) {
          // Créer le code PIN
          await sql`
            INSERT INTO pin_codes (profile_id, pin_code)
            VALUES (${profile.id}, ${hashedPin})
          `;
          createdCount++;
          console.log(`✅ Code PIN créé pour ${profile.name} (ID: ${profile.id})`);
        } else {
          existingCount++;
          console.log(`⚠️ Code PIN existe déjà pour ${profile.name} (ID: ${profile.id})`);
        }
      } catch (error) {
        console.error(`❌ Erreur pour ${profile.name}:`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Codes PIN initialisés avec succès',
      data: {
        profiles: profiles.length,
        created: createdCount,
        existing: existingCount,
        defaultPin: defaultPin
      }
    });

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de l\'initialisation des codes PIN');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}
