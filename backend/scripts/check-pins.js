// Script pour vérifier les codes PIN en base
const { default: sql, pool } = require('../lib/database.js');

async function checkPins() {
  console.log('🔍 Vérification des codes PIN en base de données\n');
  
  try {
    // Récupérer tous les profils
    const profiles = await sql`
      SELECT id, name, type, is_admin, is_child, is_teen
      FROM profiles 
      ORDER BY id
    `;
    
    console.log('📋 Profils trouvés:');
    profiles.forEach(profile => {
      console.log(`- ID: ${profile.id}, Nom: ${profile.name}, Type: ${profile.type}`);
    });
    
    // Récupérer les codes PIN
    const pins = await sql`
      SELECT profile_id, created_at, updated_at
      FROM pin_codes 
      ORDER BY profile_id
    `;
    
    console.log('\n🔐 Codes PIN trouvés:');
    if (pins.length === 0) {
      console.log('❌ Aucun code PIN trouvé !');
      console.log('\n💡 Solution: Initialiser les codes PIN par défaut');
    } else {
      pins.forEach(pin => {
        console.log(`- Profil ID: ${pin.profile_id}, Créé: ${pin.created_at}`);
      });
    }
    
    // Vérifier si le profil Parent (ID 1) a un code PIN
    const parentPin = await sql`
      SELECT pin_code, created_at
      FROM pin_codes 
      WHERE profile_id = 1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (parentPin.length === 0) {
      console.log('\n❌ Le profil Parent (ID 1) n\'a pas de code PIN !');
      console.log('💡 Il faut créer un code PIN par défaut');
    } else {
      console.log('\n✅ Le profil Parent a un code PIN');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkPins().finally(() => pool.end());
