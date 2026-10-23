#!/usr/bin/env node

/**
 * Initialise le code d'entrée familial (table family_gate).
 * Usage : node scripts/init-family-gate.js <CODE>
 * Aucun code par défaut : un code connu de tous (ex. 1234) ouvrirait l'accès à l'API.
 */

const { NativeHashService } = require('../lib/nativeHash.js');
const { assertStrongPin } = require('./pinPolicy.js');

async function initFamilyGate() {
  console.log('🔐 Initialisation du code d\'entrée familial\n');

  let pin;
  try {
    pin = assertStrongPin(process.argv[2] || process.env.FAMILY_GATE_PIN);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    console.error('   Usage : node scripts/init-family-gate.js <code à 4-8 chiffres>');
    process.exit(1);
  }

  try {
    const hashedPin = await NativeHashService.hashPin(pin);

    // Scripts CLI : pool.query puis fermeture explicite du pool pour que Node termine.
    const db = require('../lib/database.js');
    await db.query(
      `
        INSERT INTO family_gate (id, pin_hash, updated_at)
        VALUES (1, $1, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          pin_hash = EXCLUDED.pin_hash,
          -- Nouveau code : les sessions « famille » ouvertes avec l'ancien sont révoquées
          token_version = family_gate.token_version + 1,
          updated_at = CURRENT_TIMESTAMP
      `,
      [hashedPin]
    );
    console.log('✅ Code d\'entrée familial initialisé');
    console.log('\n📝 Modifiez ce code dans Paramètres Parent > Code d\'entrée familial.');

    // Fermer le pool pour éviter que le script reste vivant
    await db.pool.end();
  } catch (err) {
    if (err.code === '42P01') {
      // La table est créée par les migrations (migrations/0001_baseline.sql)
      console.error('❌ Table family_gate absente. Appliquez d\'abord les migrations : pnpm run migrate (ou démarrez le serveur).');
    } else {
      console.error('❌ Erreur:', err.message);
    }
    try {
      // Best-effort: s'assurer que le script se termine
      const db = require('../lib/database.js');
      await db.pool.end();
    } catch (_e) {}
    process.exit(1);
  }
}

initFamilyGate();
