// Script pour initialiser un code PIN sur les profils qui n'en ont pas encore
// Usage : node scripts/init-default-pins.js <PIN>
// Le PIN doit être choisi par vous (4 à 8 chiffres) : aucun PIN par défaut n'est imposé,
// un code connu de tous (ex. 1234) permettrait à un enfant d'ouvrir l'espace parent.
const { NativeHashService } = require('../lib/nativeHash.js');
const { default: sql, pool } = require('../lib/database.js');
const { assertStrongPin } = require('./pinPolicy.js');

async function initDefaultPins(pin) {
  console.log('🔐 Initialisation des codes PIN manquants\n');

  const profiles = await sql`
    SELECT id, name, type
    FROM profiles
    ORDER BY id
  `;

  console.log('📋 Profils trouvés:');
  profiles.forEach(profile => {
    console.log(`- ID: ${profile.id}, Nom: ${profile.name}, Type: ${profile.type}`);
  });

  const hashedPin = await NativeHashService.hashPin(pin);

  for (const profile of profiles) {
    try {
      const existingPin = await sql`
        SELECT id FROM pin_codes WHERE profile_id = ${profile.id}
      `;

      if (existingPin.length === 0) {
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

  console.log('\n🎉 Initialisation terminée ! Modifiez ensuite chaque PIN depuis les paramètres Parent.');
}

try {
  const pin = assertStrongPin(process.argv[2] || process.env.INITIAL_PIN);
  initDefaultPins(pin)
    .catch((error) => {
      console.error('❌ Erreur:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
} catch (error) {
  console.error(`❌ ${error.message}`);
  console.error('   Usage : node scripts/init-default-pins.js <PIN à 4-8 chiffres>');
  process.exit(1);
}
