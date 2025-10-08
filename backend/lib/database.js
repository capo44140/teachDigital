import { neon } from '@neondatabase/serverless';

// Configuration de la base de données Neon
const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

// Créer l'instance de connexion Neon
let sql;

try {
  if (config.connectionString) {
    console.log('🔗 Connexion à Neon DB configurée');
    sql = neon(config.connectionString);
  } else {
    throw new Error('DATABASE_URL non définie dans les variables d\'environnement');
  }
} catch (error) {
  console.error('❌ Erreur de configuration Neon DB:', error);
  throw error;
}

// Fonction pour tester la connexion
export async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Connexion à la base de données testée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    return false;
  }
}

export default sql;

