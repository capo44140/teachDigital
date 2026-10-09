import pkg from 'pg';
import { config } from 'dotenv';

const { Pool } = pkg;

// Charger les variables d'environnement
config();

// Configuration de la base de données PostgreSQL
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || process.env.NEON_HOST,
  database: process.env.DB_DATABASE || process.env.NEON_DATABASE,
  username: process.env.DB_USERNAME || process.env.NEON_USERNAME,
  password: process.env.DB_PASSWORD || process.env.NEON_PASSWORD,
  port: process.env.DB_PORT || process.env.NEON_PORT || 5432,
  ssl: process.env.DB_SSL !== 'false'
};

// Créer l'instance de connexion PostgreSQL
let sql;

try {
  if (dbConfig.connectionString) {
    sql = postgres(dbConfig.connectionString);
    console.log('✅ Connexion à PostgreSQL configurée avec la connection string');
  } else if (dbConfig.host && dbConfig.username && dbConfig.password && dbConfig.database) {
    const connectionString = `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}${dbConfig.ssl ? '?sslmode=require' : ''}`;
    sql = postgres(connectionString);
    console.log('✅ Connexion à PostgreSQL configurée avec les variables individuelles');
  } else {
    throw new Error('Configuration de base de données manquante. Vérifiez vos variables d\'environnement.');
  }
} catch (error) {
  console.error('❌ Erreur de configuration PostgreSQL:', error);
  console.error('💡 Assurez-vous que vos variables d\'environnement sont configurées dans le fichier .env');
  throw error;
}

async function migrateDatabase() {
  try {
    console.log('🚀 Migration de la base de données pour les images...');
    
    // Vérifier si les colonnes existent déjà
    const columnsExist = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('image_url', 'image_data', 'image_type')
    `;
    
    if (columnsExist.length === 0) {
      console.log('📝 Ajout des colonnes d\'images...');
      
      // Ajouter les colonnes d'images
      await sql`
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS image_url TEXT,
        ADD COLUMN IF NOT EXISTS image_data TEXT,
        ADD COLUMN IF NOT EXISTS image_type VARCHAR(50)
      `;
      
      console.log('✅ Colonnes d\'images ajoutées avec succès');
    } else {
      console.log('ℹ️ Les colonnes d\'images existent déjà');
    }
    
    // Vérifier la structure de la table
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Structure de la table profiles:');
    tableStructure.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('✅ Migration terminée avec succès !');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Démarrage de la migration des images...');
  
  try {
    // Vérifier la configuration
    if (!dbConfig.connectionString && (!dbConfig.host || !dbConfig.username || !dbConfig.password || !dbConfig.database)) {
      console.error('❌ Configuration de base de données manquante !');
      console.error('💡 Veuillez configurer vos variables d\'environnement :');
      console.error('   - Créez un fichier .env à la racine du projet');
      console.error('   - Ajoutez soit DATABASE_URL soit les variables NEON_*');
      console.error('   - Consultez env.example pour un exemple de configuration');
      process.exit(1);
    }
    
    // Tester la connexion
    const testResult = await sql`SELECT 1 as test`;
    console.log('✅ Connexion à la base de données testée');
    
    // Effectuer la migration
    const migrationSuccess = await migrateDatabase();
    
    if (migrationSuccess) {
      console.log('🎉 Migration des images terminée avec succès !');
      console.log('💡 Vous pouvez maintenant utiliser les images dans vos profils');
    } else {
      console.error('❌ Échec de la migration');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    console.error('💡 Vérifiez votre configuration de base de données dans le fichier .env');
    process.exit(1);
  }
}

// Exécuter la migration
main();
