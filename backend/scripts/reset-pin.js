#!/usr/bin/env node

/**
 * Réinitialise le code PIN d'un profil (ex. parent qui a oublié son code).
 * Remplace l'ancien frontend/scripts/update-parent-pin.js (format de hachage obsolète).
 *
 * Usage (dans backend/, avec le .env de la base visée) :
 *   node scripts/reset-pin.js <id du profil> <nouveau PIN à 4-8 chiffres>
 *   pnpm run reset-pin -- 1 482915
 * Sur le NAS : docker exec -it teachdigital-backend node scripts/reset-pin.js 1 482915
 *
 * Les sessions ouvertes avec l'ancien PIN sont révoquées (token_version incrémentée),
 * comme lors d'un changement de PIN depuis l'interface. Même politique que l'API :
 * PIN non trivial, 6 chiffres minimum pour un parent.
 *
 * Les verrouillages après échecs sont gardés en mémoire par le backend : s'ils bloquent
 * encore la connexion, redémarrer le conteneur (docker restart teachdigital-backend).
 */

const { NativeHashService } = require('../lib/nativeHash.js');
const { assertStrongPin } = require('./pinPolicy.js');

async function resetPin(profileId, rawPin) {
  const { pool } = require('../lib/database.js');
  try {
    const found = await pool.query('SELECT is_admin FROM profiles WHERE id = $1', [profileId]);
    if (!found.rows[0]) {
      throw new Error(`Profil ${profileId} introuvable`);
    }
    const pin = assertStrongPin(rawPin, { isAdmin: found.rows[0].is_admin === true });
    const hashedPin = await NativeHashService.hashPin(pin);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'UPDATE profiles SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_admin',
        [profileId]
      );
      if (!rows[0]) {
        throw new Error(`Profil ${profileId} introuvable`);
      }
      await client.query(
        `INSERT INTO pin_codes (profile_id, pin_code) VALUES ($1, $2)
         ON CONFLICT (profile_id) DO UPDATE SET pin_code = EXCLUDED.pin_code, updated_at = CURRENT_TIMESTAMP`,
        [profileId, hashedPin]
      );
      await client.query('COMMIT');
      const profile = rows[0];
      console.log(`✅ PIN réinitialisé pour « ${profile.name} » (profil ${profile.id}${profile.is_admin ? ', parent' : ''})`);
      console.log('   Les sessions ouvertes sur ce profil sont révoquées (prise en compte sous 30 s).');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

const profileId = parseInt(process.argv[2], 10);
try {
  if (!Number.isInteger(profileId) || profileId <= 0) {
    throw new Error('Identifiant de profil requis');
  }
  // Format vérifié tout de suite ; la longueur minimale d'un parent l'est après lecture du profil
  assertStrongPin(process.argv[3]);
} catch (error) {
  console.error(`❌ ${error.message}`);
  console.error('   Usage : node scripts/reset-pin.js <id du profil> <PIN à 4-8 chiffres, 6 minimum pour un parent>');
  process.exit(1);
}

resetPin(profileId, process.argv[3]).catch((error) => {
  console.error(`❌ Réinitialisation impossible : ${error.message}`);
  process.exit(1);
});
