/**
 * Configuration globale pour les tests Jest
 * Ce fichier est exécuté avant tous les tests
 */

// Augmenter le timeout par défaut pour Jest (30 secondes)
jest.setTimeout(30000);

// Charger les variables d'environnement pour les tests
// Chercher le fichier .env dans le répertoire backend
const path = require('path');
const dotenv = require('dotenv');

// Charger depuis le répertoire backend
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// Aussi depuis la racine du projet au cas où
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Vérifier que les variables d'environnement essentielles sont définies
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.warn('⚠️  Avertissement: Variables de base de données non configurées');
  console.warn('   Les tests nécessitent DATABASE_URL ou (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)');
  console.warn('   Vérifiez que le fichier .env existe dans backend/ ou à la racine du projet');
}

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  Avertissement: JWT_SECRET non configuré');
  console.warn('   Les tests d\'authentification peuvent échouer');
  // Utiliser une valeur par défaut pour les tests
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest-tests-only';
}

// Afficher la configuration détectée (sans les secrets)
if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL détectée');
} else if (process.env.DB_HOST) {
  console.log(`✅ Configuration DB détectée: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`);
} else {
  console.error('❌ Aucune configuration de base de données trouvée');
}

