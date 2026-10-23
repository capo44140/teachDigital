/**
 * Données de test partagées par les suites d'intégration passant par le routeur.
 */
const { default: sql } = require('../../../lib/database.js');
const { NativeHashService } = require('../../../lib/nativeHash.js');
const { generateFamilyToken, generateToken } = require('../../../lib/auth.js');

// Code familial configuré (requis pour qu'un jeton famille soit accepté). Renvoie sa version.
async function ensureFamilyGate(pin = '4826') {
  const hash = await NativeHashService.hashPin(pin);
  await sql`INSERT INTO family_gate (id, pin_hash) VALUES (1, ${hash}) ON CONFLICT (id) DO NOTHING`;
  const rows = await sql`SELECT token_version FROM family_gate WHERE id = 1`;
  return rows[0].token_version;
}

// Jeton famille valide pour la version courante du code familial
async function currentFamilyToken() {
  const rows = await sql`SELECT token_version FROM family_gate WHERE id = 1`;
  return generateFamilyToken(rows[0]?.token_version ?? 0).token;
}

// Jeton profil valide pour la version courante du profil
async function currentProfileToken(profile) {
  const rows = await sql`SELECT token_version, is_admin, name, type FROM profiles WHERE id = ${profile.id}`;
  return generateToken({
    profileId: profile.id,
    name: rows[0].name,
    type: rows[0].type,
    isAdmin: rows[0].is_admin,
    tokenVersion: rows[0].token_version
  });
}

module.exports = {
  ensureFamilyGate,
  currentFamilyToken,
  currentProfileToken
};
