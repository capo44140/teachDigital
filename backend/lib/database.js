const { Pool } = require('pg');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Configuration de la connexion PostgreSQL
// Supporte deux méthodes : variables séparées ou DATABASE_URL
let poolConfig;

if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD) {
  // Méthode 1 : Variables d'environnement séparées (préférée)
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 60000,
  };
  console.log('🔗 Connexion PostgreSQL configurée avec variables séparées');
  console.log(`📍 Hôte: ${process.env.DB_HOST}:${poolConfig.port}`);
  console.log(`📊 Base de données: ${process.env.DB_NAME}`);
} else if (process.env.DATABASE_URL) {
  // Méthode 2 : Connection string (compatibilité)
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error('DATABASE_URL doit commencer par postgresql:// ou postgres://');
  }
  
  poolConfig = {
    connectionString,
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 60000,
    ssl: false,
  };
  console.log('🔗 Connexion PostgreSQL configurée avec DATABASE_URL');
  console.log('🔍 DATABASE_URL détectée:', connectionString.replace(/:[^:@]+@/, ':****@'));
} else {
  const error = new Error('Configuration PostgreSQL manquante. Définissez soit (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) soit DATABASE_URL.');
  console.error('❌ Erreur de configuration PostgreSQL:', error.message);
  console.error('💡 Variables requises: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD (ou DATABASE_URL)');
  throw error;
}

// Créer l'instance de connexion PostgreSQL avec Pool
let pool;

try {
  pool = new Pool(poolConfig);
  
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
  console.error('💡 Vérifiez que les variables d\'environnement sont correctement configurées');
  throw error;
}

// Fonction pour tester la connexion
async function testConnection() {
  try {
    console.log('🔄 Tentative de connexion à PostgreSQL...');
    if (process.env.DB_HOST) {
      console.log(`📍 Hôte: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`);
      console.log(`📊 Base de données: ${process.env.DB_NAME}`);
    } else {
      console.log('📍 Utilisation de DATABASE_URL');
    }
    
    const client = await pool.connect();
    console.log('✅ Connexion réussie à PostgreSQL!');
    
    // Exécuter une requête de test
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('\n📅 Heure actuelle du serveur:', result.rows[0].current_time);
    console.log('🔖 Version PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Afficher les bases de données disponibles
    const dbResult = await client.query(`
      SELECT datname
      FROM pg_database
      WHERE datistemplate = false
      ORDER BY datname;
    `);
    
    console.log('\n📚 Bases de données disponibles:');
    dbResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.datname}`);
    });
    
    // Tester la table profiles
    try {
      console.log('\n🔍 Test de la table "profiles"...');
      
      // Vérifier si la table existe et compter les lignes
      const countResult = await client.query('SELECT COUNT(*) as count FROM profiles');
      console.log(`   📊 Nombre d'enregistrements: ${countResult.rows[0].count}`);
      
      // Afficher la structure de la table
      const columnsResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        ORDER BY ordinal_position;
      `);
      
      if (columnsResult.rows.length > 0) {
        console.log('\n   📋 Structure de la table "profiles":');
        columnsResult.rows.forEach((col, index) => {
          const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          console.log(`   ${index + 1}. ${col.column_name} - ${col.data_type}${length}`);
        });
      }
      
      // Afficher quelques exemples d'enregistrements (limité à 5)
      const sampleResult = await client.query('SELECT * FROM profiles LIMIT 5');
      if (sampleResult.rows.length > 0) {
        console.log('\n   📝 Exemples d\'enregistrements (max 5):');
        sampleResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}.`, row);
        });
      } else {
        console.log('\n   ℹ️ La table "profiles" est vide');
      }
      
      console.log('   ✅ Table "profiles" accessible avec succès!');
    } catch (profileError) {
      console.error('   ⚠️ Erreur lors du test de la table "profiles":', profileError.message);
      console.error('   💡 Vérifiez que la table "profiles" existe dans la base de données');
    }
    
    client.release();
    console.log('\n✨ Test terminé avec succès!');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    console.error('\n💡 Vérifiez:');
    console.error('   - Que PostgreSQL est bien démarré');
    console.error('   - Que le port est correctement configuré');
    console.error('   - Que les identifiants dans le fichier .env sont corrects');
    console.error('   - Que le pare-feu autorise la connexion');
    return false;
  }
}

// Logger l'état de la connexion au démarrage
console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 Initialisation du Backend TeachDigital');
console.log('═══════════════════════════════════════════════════════════');
console.log('📡 Configuration PostgreSQL:');
if (process.env.DB_HOST) {
  console.log(`   - Hôte: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`);
  console.log(`   - Base de données: ${process.env.DB_NAME}`);
  console.log(`   - Utilisateur: ${process.env.DB_USER}`);
  console.log(`   - SSL: ${process.env.DB_SSL === 'true' ? 'enabled' : 'disabled'}`);
} else {
  console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'non définie'}`);
  console.log('   - SSL Mode: disabled');
}
console.log('   - Connect Timeout: 60s');
console.log('   - Idle Timeout: 60s');
console.log('   - Max Connections: 5');
console.log('   - Retry automatique: enabled (5x avec backoff)');
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
      
      // Log de débogage pour toutes les valeurs
      if (value && typeof value === 'object') {
        console.log(`🔍 [${i}] Valeur détectée:`, {
          type: typeof value,
          hasText: 'text' in value,
          hasParams: 'params' in value,
          textValue: value.text ? value.text.substring(0, 50) : 'undefined',
          paramsValue: value.params,
          isArray: Array.isArray(value.params),
          keys: Object.keys(value).slice(0, 10)
        });
      }
      
      if (value instanceof SqlIdentifier) {
        // Les identifiants sont intégrés directement (pas de paramètre)
        result += value.value;
      } else if (value && typeof value === 'object' && 'text' in value && 'params' in value && Array.isArray(value.params)) {
        // Si c'est une requête SQL précédente, on l'intègre avec ses paramètres
        // On doit réindexer les paramètres
        const subText = String(value.text || '');
        const subParams = value.params || [];
        
        if (subParams.length > 0) {
          const reindexedText = subText.replace(/\$(\d+)/g, (match, num) => {
            const oldIndex = parseInt(num);
            if (oldIndex > 0 && oldIndex <= subParams.length) {
              params_array.push(subParams[oldIndex - 1]);
              const newIndex = paramCounter++;
              return '$' + newIndex;
            }
            return match; // Garder le placeholder original si index invalide
          });
          result += reindexedText;
        } else {
          // Pas de paramètres, juste ajouter le texte
          result += subText;
        }
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
  
  // Créer un objet qui peut être utilisé dans d'autres templates ET awaité
  // Ne PAS exécuter immédiatement - seulement quand on await
  const queryText = query.text;
  const queryParams = query.params;
  
  // Créer une Promise qui sera exécutée seulement quand on await
  const executeQuery = async () => {
    const client = await pool.connect();
    try {
      // Log temporaire pour déboguer
      if (queryText.includes('ORDER') || queryText.includes('AND')) {
        console.log('🔍 SQL généré:', queryText.substring(0, 300));
        console.log('🔍 Params:', queryParams);
      }
      // Ajouter un timeout de 20 secondes sur la requête (laisse de la marge avant le timeout Vercel de 60s)
      const queryPromise = client.query(queryText, queryParams);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout: requête SQL dépassée 20 secondes')), 20000);
      });
      const result = await Promise.race([queryPromise, timeoutPromise]);
      return result.rows;
    } finally {
      client.release();
    }
  };
  
  // Créer la Promise mais ne pas l'exécuter immédiatement
  let promiseResolve, promiseReject;
  const promise = new Promise((resolve, reject) => {
    promiseResolve = resolve;
    promiseReject = reject;
  });
  
  // Ajouter les propriétés text et params directement sur la Promise
  // Utiliser Object.defineProperty pour s'assurer qu'elles sont accessibles
  Object.defineProperty(promise, 'text', {
    value: queryText,
    writable: false,
    enumerable: true,
    configurable: false
  });
  
  Object.defineProperty(promise, 'params', {
    value: queryParams,
    writable: false,
    enumerable: true,
    configurable: false
  });
  
  // Surcharger then pour exécuter la requête
  promise.then = function(resolve, reject) {
    return executeQuery().then(resolve, reject);
  };
  
  promise.catch = function(reject) {
    return executeQuery().catch(reject);
  };
  
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

