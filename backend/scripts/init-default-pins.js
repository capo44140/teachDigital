// Script pour initialiser les codes PIN par défaut
import bcrypt from 'bcryptjs';
import sql from '../lib/database.js';

async function initDefaultPins() {
  console.log('🔐 Initialisation des codes PIN par défaut\n');
  
  try {
    // Vérifier les profils existants
    const profiles = await sql`
      SELECT id, name, type
      FROM profiles 
      ORDER BY id
    `;
    
    console.log('📋 Profils trouvés:');
    profiles.forEach(profile => {
      console.log(`- ID: ${profile.id}, Nom: ${profile.name}, Type: ${profile.type}`);
    });
    
    // Code PIN par défaut
    const defaultPin = '1234';
    const saltRounds = 12;
    const hashedPin = await bcrypt.hash(defaultPin, saltRounds);
    
    console.log(`\n🔑 Code PIN par défaut: ${defaultPin}`);
    console.log('🔒 Code PIN haché:', hashedPin.substring(0, 20) + '...');
    
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
          console.log(`✅ Code PIN créé pour ${profile.name} (ID: ${profile.id})`);
        } else {
          console.log(`⚠️ Code PIN existe déjà pour ${profile.name} (ID: ${profile.id})`);
        }
      } catch (error) {
        console.error(`❌ Erreur pour ${profile.name}:`, error.message);
      }
    }
    
    console.log('\n🎉 Initialisation terminée !');
    console.log('\n📝 Codes PIN par défaut:');
    console.log('- Tous les profils: 1234');
    console.log('\n🧪 Test de connexion:');
    console.log('- Profil: Parent (ID: 1)');
    console.log('- Code PIN: 1234');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

initDefaultPins();
