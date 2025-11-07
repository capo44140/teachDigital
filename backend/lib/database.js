const postgres = require('postgres');

// Configuration de la base de données PostgreSQL
const config = {
  connectionString: process.env.DATABASE_URL
};

// Créer l'instance de connexion PostgreSQL
let sql;

try {
  if (config.connectionString) {
    console.log('🔗 Connexion à PostgreSQL configurée');
    // postgres accepte directement la connection string
    sql = postgres(config.connectionString);
  } else {
    throw new Error('DATABASE_URL non définie dans les variables d\'environnement');
  }
} catch (error) {
  console.error('❌ Erreur de configuration PostgreSQL:', error);
  throw error;
}

// Fonction pour tester la connexion
async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Connexion à la base de données testée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    return false;
  }
}

module.exports = {
  default: sql,
  testConnection
};

