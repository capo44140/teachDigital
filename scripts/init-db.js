import { initializeDatabase, insertTestData, testConnection } from '../src/config/database.js';

async function main() {
  console.log('🚀 Initialisation de la base de données TeachDigital...');
  
  try {
    // Tester la connexion
    console.log('📡 Test de connexion à Neon DB...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Impossible de se connecter à la base de données');
      console.error('Vérifiez votre configuration dans le fichier .env');
      process.exit(1);
    }
    
    // Initialiser la base de données
    console.log('🏗️ Création des tables...');
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      console.error('❌ Erreur lors de l\'initialisation de la base de données');
      process.exit(1);
    }
    
    // Insérer les données de test
    console.log('📝 Insertion des données de test...');
    const testDataInserted = await insertTestData();
    
    if (!testDataInserted) {
      console.error('❌ Erreur lors de l\'insertion des données de test');
      process.exit(1);
    }
    
    console.log('✅ Base de données initialisée avec succès !');
    console.log('🎉 Votre application TeachDigital est prête à utiliser Neon DB');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

// Exécuter le script
main();
