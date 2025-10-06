import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Configuration de la base de données Neon pour les scripts de test
const config = {
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  host: process.env.NEON_HOST || process.env.VITE_NEON_HOST,
  database: process.env.NEON_DATABASE || process.env.VITE_NEON_DATABASE,
  username: process.env.NEON_USERNAME || process.env.VITE_NEON_USERNAME,
  password: process.env.NEON_PASSWORD || process.env.VITE_NEON_PASSWORD,
  port: process.env.NEON_PORT || process.env.VITE_NEON_PORT || 5432,
  ssl: true
};

let sql;

try {
  if (config.connectionString) {
    console.log('🔗 Utilisation de la connection string complète');
    sql = neon(config.connectionString);
  } else if (config.host && config.username && config.password && config.database) {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?sslmode=require`;
    console.log('🔗 Construction de la connection string à partir des variables individuelles');
    sql = neon(connectionString);
  } else {
    throw new Error('Aucune configuration de base de données valide trouvée. Vérifiez vos variables d\'environnement.');
  }
  
  console.log('✅ Connexion à Neon DB configurée avec succès');
} catch (error) {
  console.error('❌ Erreur de configuration Neon DB:', error);
  process.exit(1);
}

export default sql;
