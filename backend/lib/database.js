const postgres = require('postgres');

// Configuration de la base de données PostgreSQL
const connectionString = process.env.DATABASE_URL;

// Vérifier que DATABASE_URL est définie et non vide
if (!connectionString || connectionString.trim() === '') {
  const error = new Error('DATABASE_URL non définie ou vide dans les variables d\'environnement. Vérifiez votre configuration Vercel.');
  console.error('❌ Erreur de configuration PostgreSQL:', error.message);
  console.error('💡 Pour Vercel, ajoutez DATABASE_URL dans Settings > Environment Variables');
  throw error;
}

// Créer l'instance de connexion PostgreSQL
let sql;

try {
  // Vérifier que la connection string est valide (commence par postgresql:// ou postgres://)
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error('DATABASE_URL doit commencer par postgresql:// ou postgres://');
  }
  
  console.log('🔗 Connexion à PostgreSQL configurée');
  console.log('🔍 DATABASE_URL détectée:', connectionString.replace(/:[^:@]+@/, ':****@')); // Masquer le mot de passe dans les logs
  
  // Configuration OPTIMISÉE pour Neon/Vercel serverless
  sql = postgres(connectionString, {
    ssl: 'require', // Nécessaire pour Neon
    max: 1, // Limiter les connexions pour Vercel serverless
    idle_timeout: 30, // Augmenté de 20 à 30 secondes
    connect_timeout: 30, // Augmenté de 10 à 30 secondes (CRITICAL)
    statement_timeout: 30000, // Timeout pour les requêtes: 30 secondes
    
    // Options de reconnexion pour Neon
    backoff: {
      start: 100,
      max: 3000,
      multiplier: 2
    },
    
    // Callbacks pour gérer les erreurs de connexion
    onconnect: async (connection) => {
      console.log('✅ Nouvelle connexion PostgreSQL établie');
    },
    
    ondisconnect: async (connection) => {
      console.log('⚠️ Connexion PostgreSQL fermée');
    },
    
    onerror: (error) => {
      console.error('❌ Erreur de connexion PostgreSQL:', error.code, error.message);
    }
  });
} catch (error) {
  console.error('❌ Erreur de configuration PostgreSQL:', error);
  console.error('💡 Vérifiez que DATABASE_URL est correctement configurée sur Vercel');
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

// Fonction wrapper pour exécuter des requêtes avec retry automatique
async function executeWithRetry(queryFn, maxRetries = 3, delayMs = 500) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      
      // Vérifier si c'est une erreur temporaire
      const isTemporaryError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'EHOSTUNREACH' ||
        error.message?.includes('socket disconnected') ||
        error.message?.includes('Connection lost');
      
      if (!isTemporaryError || attempt === maxRetries) {
        // Erreur permanente ou dernier essai
        throw error;
      }
      
      // Attendre avant de réessayer (avec backoff exponentiel)
      const delay = delayMs * Math.pow(2, attempt - 1);
      console.log(`⏳ Retry ${attempt}/${maxRetries} après ${delay}ms - Erreur: ${error.code}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

module.exports = {
  default: sql,
  testConnection,
  executeWithRetry
};

