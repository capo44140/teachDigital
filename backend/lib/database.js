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
  console.log('📝 Longueur DATABASE_URL:', connectionString.length, 'caractères');
  
  // Configuration OPTIMISÉE pour Neon/Vercel serverless
  sql = postgres(connectionString, {
    ssl: 'require', // Nécessaire pour Neon
    max: 1, // Limiter les connexions pour Vercel serverless
    idle_timeout: 60, // 60 secondes (augmenté)
    connect_timeout: 60, // 60 secondes pour le TLS handshake (CRITICAL - augmenté)
    statement_timeout: 60000, // 60 secondes pour les requêtes
    
    // Options de reconnexion pour Neon - TRÈS agressif pour Vercel
    backoff: {
      start: 500,  // Commencer avec 500ms
      max: 5000,   // Max 5 secondes entre les retries
      multiplier: 2
    },
    
    // Désactiver transform_column_names par défaut (peut causer des problèmes)
    transform: {
      undefined: undefined,
      null: null
    },
    
    // Callbacks pour gérer les erreurs de connexion
    onconnect: async (connection) => {
      console.log('✅ Nouvelle connexion PostgreSQL établie avec succès');
    },
    
    ondisconnect: async (connection) => {
      console.log('⚠️ Connexion PostgreSQL fermée');
    },
    
    onerror: (error) => {
      console.error('❌ ERREUR CRITIQUE de connexion PostgreSQL:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Host:', error.host || 'undefined');
      console.error('   Port:', error.port || 'undefined');
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
    console.log('🔍 Test de connexion à la base de données...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Connexion à la base de données testée avec succès');
    console.log('📊 Paramètres de connexion:');
    console.log('   - SSL: required');
    console.log('   - Connect Timeout: 30 secondes');
    console.log('   - Statement Timeout: 30 secondes');
    console.log('   - Max connexions: 1 (Vercel Serverless)');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    console.error('💡 Vérifications à faire:');
    console.error('   - DATABASE_URL est-elle correctement configurée?');
    console.error('   - Le cluster Neon est-il disponible?');
    console.error('   - Les pare-feu/IP whitelist permettent la connexion?');
    return false;
  }
}

// Logger l'état de la connexion au démarrage
console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 Initialisation du Backend TeachDigital');
console.log('═══════════════════════════════════════════════════════════');
console.log('📡 Configuration PostgreSQL/Neon:');
console.log(`   - DATABASE_URL: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);
console.log('   - SSL Mode: require');
console.log('   - Connect Timeout: 30s');
console.log('   - Statement Timeout: 30s');
console.log('   - Idle Timeout: 30s');
console.log('   - Max Connections: 1');
console.log('   - Retry automatique: enabled (3x avec backoff)');
console.log('═══════════════════════════════════════════════════════════');

// Fonction wrapper pour exécuter des requêtes avec retry automatique
async function executeWithRetry(queryFn, maxRetries = 5, delayMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Tentative ${attempt}/${maxRetries} de connexion à la base de données...`);
      return await queryFn();
    } catch (error) {
      lastError = error;
      
      // Vérifier si c'est une erreur temporaire
      const isTemporaryError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'EHOSTUNREACH' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ERR_TLS_CERT_HAS_EXPIRED' ||
        error.message?.includes('socket disconnected') ||
        error.message?.includes('Connection lost') ||
        error.message?.includes('TLS') ||
        error.message?.includes('timeout');
      
      if (!isTemporaryError || attempt === maxRetries) {
        // Erreur permanente ou dernier essai
        console.error(`❌ ERREUR FINALE après ${attempt} tentatives:`, {
          code: error.code,
          message: error.message,
          isTemporaryError
        });
        throw error;
      }
      
      // Attendre avant de réessayer (avec backoff exponentiel)
      const delay = delayMs * Math.pow(2, attempt - 1);
      console.log(`⏳ Retry ${attempt}/${maxRetries} après ${delay}ms`);
      console.log(`   Erreur: ${error.code} - ${error.message?.substring(0, 100)}`);
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

