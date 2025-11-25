/**
 * Script pour vérifier la connexion à la base de données avant les tests
 */

const { default: sql } = require('../lib/database.js');

async function checkConnection() {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      console.error('❌ Timeout: La connexion à la base de données prend trop de temps (>10s)');
      console.error('   Vérifiez que la base de données est accessible');
      resolve(false);
    }, 10000); // 10 secondes max

    try {
      console.log('🔍 Vérification de la connexion à la base de données...');
      const result = await sql`SELECT 1 as test`;
      clearTimeout(timeout);
      
      if (result && result.length > 0) {
        console.log('✅ Connexion à la base de données réussie');
        resolve(true);
      } else {
        throw new Error('La requête de test n\'a retourné aucun résultat');
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('❌ Erreur de connexion à la base de données:', error.message);
      console.error('   Vérifiez vos variables d\'environnement:');
      console.error('   - DATABASE_URL ou (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)');
      console.error('   - JWT_SECRET');
      resolve(false);
    }
  });
}

// Exécuter la vérification
if (require.main === module) {
  checkConnection().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { checkConnection };

