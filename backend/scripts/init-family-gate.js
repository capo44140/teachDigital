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

    await sql`
      INSERT INTO family_gate (id, pin_hash, updated_at)
      VALUES (1, ${hashedPin}, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        pin_hash = EXCLUDED.pin_hash,
        updated_at = CURRENT_TIMESTAMP
    `;
    console.log('✅ Code d\'entrée familial initialisé (défaut: 1234)');
    console.log('\n📝 Modifiez ce code dans Paramètres Parent > Code d\'entrée familial.');
  } catch (err) {
    if (err.code === '42P01') {
      console.error('❌ Table family_gate absente. Exécutez d\'abord: psql -f scripts/create-family-gate-table.sql');
    } else {
      console.error('❌ Erreur:', err.message);
    }
    process.exit(1);
  }
}

initFamilyGate();
