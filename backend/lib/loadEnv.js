/**
 * Chargement centralisé des variables d'environnement (backend)
 *
 * Objectif:
 * - En production (NODE_ENV=production ou DOCKER_ENV=true): charger uniquement `.env`
 * - En développement: charger `.env` si présent, sinon fallback sur `env` (historique)
 *
 * Note: ce loader est idempotent (safe si appelé plusieurs fois).
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

function loadBackendEnv() {
  // Idempotence (évite les doubles chargements / surprises)
  if (global.__TEACHDIGITAL_BACKEND_ENV_LOADED) return;
  global.__TEACHDIGITAL_BACKEND_ENV_LOADED = true;

  const backendRoot = path.join(__dirname, '..'); // .../backend

  const isProd =
    String(process.env.DOCKER_ENV || '').trim() === 'true' ||
    String(process.env.NODE_ENV || '').trim() === 'production';

  const dotEnvPath = path.join(backendRoot, '.env');
  const envPath = path.join(backendRoot, 'env');

  if (isProd) {
    // Production: `.env` uniquement (pas de fallback `env`)
    if (fs.existsSync(dotEnvPath)) {
      dotenv.config({ path: dotEnvPath });
      return;
    }
    dotenv.config();
    return;
  }

  // Développement: charger `.env` si présent, puis `env` en fallback (sans override)
  // Objectif: ne pas casser une config partielle dans `.env`, et compléter avec `env`.
  let loadedAny = false;
  if (fs.existsSync(dotEnvPath)) {
    dotenv.config({ path: dotEnvPath });
    loadedAny = true;
  }
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedAny = true;
  }

  if (!loadedAny) {
    // Fallback: comportement standard dotenv (.env dans cwd)
    dotenv.config();
  }
}

module.exports = {
  loadBackendEnv
};


