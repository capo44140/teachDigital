const { Pool } = require('pg');

// Configuration de la base de données PostgreSQL
const connectionString = process.env.DATABASE_URL;

// Vérifier que DATABASE_URL est définie et non vide
if (!connectionString || connectionString.trim() === '') {
  const error = new Error('DATABASE_URL non définie ou vide dans les variables d\'environnement. Vérifiez votre configuration Vercel.');
  console.error('❌ Erreur de configuration PostgreSQL:', error.message);
  console.error('💡 Pour Vercel, ajoutez DATABASE_URL dans Settings > Environment Variables');
  throw error;
}

// Créer l'instance de connexion PostgreSQL avec Pool
let pool;

try {
  // Vérifier que la connection string est valide (commence par postgresql:// ou postgres://)
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error('DATABASE_URL doit commencer par postgresql:// ou postgres://');
  }
  
  console.log('🔗 Connexion à PostgreSQL configurée');
  console.log('🔍 DATABASE_URL détectée:', connectionString.replace(/:[^:@]+@/, ':****@')); // Masquer le mot de passe dans les logs
  console.log('📝 Longueur DATABASE_URL:', connectionString.length, 'caractères');
  
  // Configuration OPTIMISÉE pour Neon/Vercel serverless avec pg
  pool = new Pool({
    connectionString,
    max: 1, // Limiter les connexions pour Vercel serverless
    idleTimeoutMillis: 60000, // 60 secondes (augmenté)
    connectionTimeoutMillis: 60000, // 60 secondes pour la connexion (CRITICAL - augmenté)
  });
  
  // Listeners pour gérer les erreurs de connexion
  pool.on('connect', () => {
    console.log('✅ Nouvelle connexion PostgreSQL établie avec succès');
  });
  
  pool.on('error', (error) => {
    console.error('❌ ERREUR CRITIQUE de connexion PostgreSQL:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Host:', error.host || 'undefined');
    console.error('   Port:', error.port || 'undefined');
  });
} catch (error) {
  console.error('❌ Erreur de configuration PostgreSQL:', error);
  console.error('💡 Vérifiez que DATABASE_URL est correctement configurée sur Vercel');
  throw error;
}

// Fonction pour tester la connexion
async function testConnection() {
  const client = await pool.connect();
  try {
    console.log('🔍 Test de connexion à la base de données...');
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Connexion à la base de données testée avec succès');
    console.log('📊 Paramètres de connexion:');
    console.log('   - SSL: required');
    console.log('   - Connect Timeout: 60 secondes');
    console.log('   - Statement Timeout: 60 secondes');
    console.log('   - Max connexions: 1 (Vercel Serverless)');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    console.error('💡 Vérifications à faire:');
    console.error('   - DATABASE_URL est-elle correctement configurée?');
    console.error('   - Le cluster Neon est-il disponible?');
    console.error('   - Les pare-feu/IP whitelist permettent la connexion?');
    return false;
  } finally {
    client.release();
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

// Objet spécial pour les identifiants SQL
function SqlIdentifier(value) {
  this.isIdentifier = true;
  this.value = String(value);
}

// Fonction helper pour construire une requête SQL à partir d'un template literal
function buildQuery(strings, values) {
  const params_array = [];
  let paramCounter = 1;
  
  const text = strings.reduce((acc, str, i) => {
    let result = acc + str;
    
    if (i < values.length) {
      const value = values[i];
      
      if (value instanceof SqlIdentifier) {
        // Les identifiants sont intégrés directement (pas de paramètre)
        result += value.value;
      } else if (value && (value.text && value.params)) {
        // Si c'est une requête SQL précédente, on l'intègre avec ses paramètres
        // On doit réindexer les paramètres
        const subParams = value.params;
        const subText = value.text.replace(/\$(\d+)/g, (match, num) => {
          const oldIndex = parseInt(num);
          params_array.push(subParams[oldIndex - 1]);
          const newIndex = paramCounter++;
          return '$' + newIndex;
        });
        result += subText;
      } else if (value === undefined || value === null) {
        // Les valeurs NULL deviennent le texte "NULL"
        result += 'NULL';
      } else {
        // Les valeurs normales deviennent des paramètres
        params_array.push(value);
        result += '$' + paramCounter++;
      }
    }
    
    return result;
  });
  
  return { text, params: params_array };
}

// Créer une fonction sql compatible avec l'API postgres et template literals
function sql(strings, ...values) {
  // Gérer les deux cas d'appel:
  // 1. Template literal: sql`SELECT ...` 
  // 2. Appel normal: sql(text, params)
  
  let query;
  
  if (Array.isArray(strings)) {
    // Template literal: sql`SELECT * FROM users WHERE id = ${123}`
    query = buildQuery(strings, values);
  } else {
    // Appel normal: sql("SELECT * FROM users WHERE id = $1", [123])
    query = { text: strings, params: values[0] || [] };
  }
  
  // Créer une vraie Promise qui expose aussi text et params pour la réutilisation
  const promise = (async () => {
    const client = await pool.connect();
    try {
      const result = await client.query(query.text, query.params);
      return result.rows;
    } finally {
      client.release();
    }
  })();
  
  // Ajouter les propriétés pour permettre la réutilisation dans d'autres templates
  promise.text = query.text;
  promise.params = query.params;
  promise.toString = () => query.text;
  
  return promise;
}

// Ajouter une méthode sql(identifier) pour créer des identifiants
sql.identifier = function(value) {
  return new SqlIdentifier(value);
};

// Stocker le pool sur la fonction pour accès direct
sql.pool = pool;

module.exports = {
  default: sql,
  pool,
  sql,
  testConnection,
  executeWithRetry,
  query: (text, params) => pool.query(text, params)
};

