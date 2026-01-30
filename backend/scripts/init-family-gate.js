#!/usr/bin/env node

/**
 * Initialise le code d'entrée familial par défaut (table family_gate).
 * Code par défaut : 1234 (à modifier dans les paramètres Parent après première connexion).
 */

const { default: sql } = require('../lib/database.js');
const { NativeHashService } = require('../lib/nativeHash.js');

const DEFAULT_PIN = '1234';

async function initFamilyGate() {
  console.log('🔐 Initialisation du code d\'entrée familial\n');

  try {
    const hashedPin = await NativeHashService.hashPin(DEFAULT_PIN);
    console.log('🔒 Code familial par défaut (1234) haché');

    // Important: `sql\`...\`` ne s'exécute pas correctement avec `await` direct
    // dans ce projet (thenable custom). Pour les scripts CLI, on passe par
    // `pool.query` et on ferme explicitement le pool pour que Node termine.
    const db = require('../lib/database.js');
    await db.query(
      `
        INSERT INTO family_gate (id, pin_hash, updated_at)
        VALUES (1, $1, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          pin_hash = EXCLUDED.pin_hash,
          updated_at = CURRENT_TIMESTAMP
      `,
      [hashedPin]
    );
    console.log('✅ Code d\'entrée familial initialisé (défaut: 1234)');
    console.log('\n📝 Modifiez ce code dans Paramètres Parent > Code d\'entrée familial.');

    // Fermer le pool pour éviter que le script reste vivant
    await db.pool.end();
  } catch (err) {
    if (err.code === '42P01') {
      console.error('❌ Table family_gate absente. Exécutez d\'abord: psql -f scripts/create-family-gate-table.sql');
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
