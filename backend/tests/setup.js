/**
 * Configuration globale pour les tests Jest
 * Ce fichier est exécuté avant chaque fichier de test.
 *
 * ⚠️ Les tests ne lisent JAMAIS backend/.env : il pointe vers la base réelle.
 * - Par défaut, la base est inaccessible (127.0.0.1:9) : seuls les tests qui mockent
 *   lib/database.js s'exécutent, les suites d'intégration sont ignorées (describeWithDb).
 * - Pour lancer les suites d'intégration, fournir une base DÉDIÉE aux tests :
 *     TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/teachdigital_test pnpm test
 */

const crypto = require('crypto');

jest.setTimeout(30000);

// Empêche lib/loadEnv.js de charger backend/.env (ou env)
global.__TEACHDIGITAL_BACKEND_ENV_LOADED = true;

for (const key of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'DB_USERNAME', 'DB_SSL']) {
  delete process.env[key];
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@127.0.0.1:9/teachdigital_test';

// Secret aléatoire par exécution : aucun jeton de test n'est valable ailleurs
if (!process.env.__TEST_JWT_SECRET) {
  process.env.__TEST_JWT_SECRET = crypto.randomBytes(32).toString('hex');
}
process.env.JWT_SECRET = process.env.__TEST_JWT_SECRET;
