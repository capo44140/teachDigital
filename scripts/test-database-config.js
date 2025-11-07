import pkg from 'pg'
import dotenv from 'dotenv'

const { Pool } = pkg;

// Charger les variables d'environnement
dotenv.config()

// Configuration de la base de données PostgreSQL pour les scripts de test
const config = {
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  host: process.env.DB_HOST || process.env.NEON_HOST || process.env.VITE_NEON_HOST,
  database: process.env.DB_DATABASE || process.env.NEON_DATABASE || process.env.VITE_NEON_DATABASE,
  username: process.env.DB_USERNAME || process.env.NEON_USERNAME || process.env.VITE_NEON_USERNAME,
  password: process.env.DB_PASSWORD || process.env.NEON_PASSWORD || process.env.VITE_NEON_PASSWORD,
  port: process.env.DB_PORT || process.env.NEON_PORT || process.env.VITE_NEON_PORT || 5432,
  ssl: process.env.DB_SSL !== 'false'
};

let pool;

try {
  if (config.connectionString) {
    console.log('🔗 Utilisation de la connection string complète');
    pool = new Pool({ connectionString: config.connectionString, ssl: { rejectUnauthorized: false } });
  } else if (config.host && config.username && config.password && config.database) {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${config.ssl ? '?sslmode=require' : ''}`;
    console.log('🔗 Construction de la connection string à partir des variables individuelles');
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  } else {
    throw new Error('Aucune configuration de base de données valide trouvée. Vérifiez vos variables d\'environnement.');
  }
  
  console.log('✅ Connexion à PostgreSQL configurée avec succès');
} catch (error) {
  console.error('❌ Erreur de configuration PostgreSQL:', error);
  process.exit(1);
}

export default pool;
