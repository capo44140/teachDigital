const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
dotenv.config();

// Configuration de la connexion PostgreSQL
// Supporte deux méthodes : variables séparées ou DATABASE_URL

// Configuration des timeouts adaptés à Vercel
// Plans gratuits: 10s max | Plans Pro/Enterprise: 60s max
// On utilise 8s par défaut pour être sûr (plans gratuits)
// Peut être augmenté via DB_QUERY_TIMEOUT_MS pour plans Pro/Enterprise

// Détecter automatiquement le maxDuration depuis vercel.json
let detectedMaxDuration = 10; // Par défaut: plan gratuit (10s)
try {
  const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
  if (fs.existsSync(vercelConfigPath)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    if (vercelConfig.functions?.['api/index.js']?.maxDuration) {
      detectedMaxDuration = vercelConfig.functions['api/index.js'].maxDuration;
      console.log(`📋 Détection automatique depuis vercel.json: maxDuration = ${detectedMaxDuration}s`);
    }
  }
} catch (error) {
  // Ignorer les erreurs de lecture de vercel.json
  console.log('ℹ️  Impossible de lire vercel.json, utilisation des valeurs par défaut');
}

const VERCEL_MAX_DURATION = parseInt(process.env.VERCEL_MAX_DURATION) || detectedMaxDuration; // Détection automatique ou variable d'environnement

// Déterminer le timeout par défaut selon le plan Vercel détecté
// Plans gratuits (10s): timeout de 8s pour laisser de la marge
// Plans Pro/Enterprise (60s): timeout de 50s pour laisser de la marge
const DEFAULT_QUERY_TIMEOUT_MS = parseInt(process.env.DB_QUERY_TIMEOUT_MS) || 
  (VERCEL_MAX_DURATION >= 60 ? 50000 : 8000); // 50s pour Pro/Enterprise, 8s pour gratuit

// Ajuster le timeout selon la configuration Vercel
// Pour plans Pro/Enterprise (60s), on peut utiliser jusqu'à 50s pour laisser de la marge
// Pour plans gratuits (10s), on limite à 8s pour éviter les timeouts
const queryTimeout = VERCEL_MAX_DURATION >= 60 
  ? Math.min(DEFAULT_QUERY_TIMEOUT_MS, 50000) // Max 50s pour plans Pro/Enterprise
  : Math.min(DEFAULT_QUERY_TIMEOUT_MS, 8000);  // Max 8s pour plans gratuits

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
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10, // Augmenter le pool pour plus de performance
    min: 2, // Maintenir au moins 2 connexions actives
    idleTimeoutMillis: 30000, // 30 secondes avant de fermer une connexion inactive
    connectionTimeoutMillis: 5000, // 5 secondes max pour établir une connexion
    statement_timeout: queryTimeout, // Timeout adaptatif selon plan Vercel
    query_timeout: queryTimeout, // Timeout adaptatif selon plan Vercel
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
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
  
  // Ajouter les options de performance à la connection string si elles ne sont pas déjà présentes
  poolConfig = {
    connectionString,
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: queryTimeout, // Timeout adaptatif selon plan Vercel
    query_timeout: queryTimeout, // Timeout adaptatif selon plan Vercel
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
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

// Fonction pour tester la connexion (version simplifiée et rapide)
async function testConnection() {
  try {
    console.log('🔄 Test rapide de connexion PostgreSQL...');
    
    const client = await pool.connect();
    
    // Test minimal : juste vérifier que la connexion fonctionne
    await client.query('SELECT 1 as test');
    
    client.release();
    console.log('✅ Connexion PostgreSQL OK');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
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
console.log('   - Connect Timeout: 5s');
console.log('   - Idle Timeout: 30s');
console.log(`   - Statement Timeout: ${queryTimeout}ms (adapté au plan Vercel: ${VERCEL_MAX_DURATION}s max)`);
console.log(`   - Query Timeout: ${queryTimeout}ms (adapté au plan Vercel: ${VERCEL_MAX_DURATION}s max)`);
console.log('   - Max Connections: ' + (parseInt(process.env.DB_MAX_CONNECTIONS) || 10));
console.log('   - Min Connections: 2');
console.log('   - Keep-Alive: enabled');
console.log('   - Retry automatique: enabled (2x max, délai 500ms)');
console.log(`   - ⚠️  Vercel Timeout: ${VERCEL_MAX_DURATION}s (${VERCEL_MAX_DURATION >= 60 ? 'Plan Pro/Enterprise' : 'Plan Gratuit'})`);
console.log('═══════════════════════════════════════════════════════════');

// Fonction wrapper pour exécuter des requêtes avec retry automatique
// OPTIMISÉ: Réduit de 5 à 2 retries max pour éviter les timeouts Vercel
// Le total (timeout query + retries) doit rester sous la limite Vercel
// Avec 2 retries de 500ms = 1s de délais max, donc timeout query peut être jusqu'à 9s pour plans gratuits
async function executeWithRetry(queryFn, maxRetries = 2, delayMs = 500) {
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
      
      // Attendre avant de réessayer (délai fixe plus court pour éviter timeout)
      const delay = delayMs; // Délai fixe au lieu de backoff exponentiel
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
      
      // Log de débogage uniquement en mode développement
      if (process.env.NODE_ENV === 'development' && value && typeof value === 'object' && !(value instanceof SqlIdentifier)) {
        // Log minimal pour le debugging
        if ('text' in value && 'params' in value) {
          console.log(`🔍 [SQL Builder] Requête imbriquée détectée à l'index ${i}`);
        }
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
  // Mesurer le temps de construction de la requête
  const buildStartTime = Date.now();
  
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
  
  const buildTime = Date.now() - buildStartTime;
  
  // Créer un objet qui peut être utilisé dans d'autres templates ET awaité
  // Ne PAS exécuter immédiatement - seulement quand on await
  const queryText = query.text;
  const queryParams = query.params;
  
  // Log si la construction prend du temps
  if (buildTime > 5) {
    console.log(`🔧 [SQL Builder] Construction requête: ${buildTime}ms`);
  }
  
  // Stocker buildTime pour l'utiliser dans les logs d'exécution
  const queryBuildTime = buildTime;
  
  // Créer une Promise qui sera exécutée seulement quand on await
  const executeQuery = async () => {
    const totalStartTime = Date.now();
    const queryId = Math.random().toString(36).substring(2, 9);
    const queryPreview = queryText.length > 100 ? queryText.substring(0, 100) + '...' : queryText;
    
    // Log de début (inclure le temps de construction)
    console.log(`🚀 [SQL:${queryId}] Début - ${queryPreview}`);
    if (queryBuildTime > 1) {
      console.log(`   🔧 Construction: ${queryBuildTime}ms`);
    }
    
    try {
      // Étape 1: Vérifier l'état du pool
      const poolCheckStart = Date.now();
      const poolStats = {
        totalCount: pool.totalCount || 0,
        idleCount: pool.idleCount || 0,
        waitingCount: pool.waitingCount || 0
      };
      const poolCheckTime = Date.now() - poolCheckStart;
      
      if (poolCheckTime > 1) {
        console.log(`⏱️  [SQL:${queryId}] Pool check: ${poolCheckTime}ms`, poolStats);
      }
      
      if (poolStats.waitingCount > 0) {
        console.warn(`⚠️  [SQL:${queryId}] ${poolStats.waitingCount} requêtes en attente dans le pool`);
      }
      
      // Étape 2: Exécution de la requête (pool.query gère l'attente et l'exécution)
      console.log(`▶️  [SQL:${queryId}] Exécution de la requête...`);
      const queryStartTime = Date.now();
      const result = await pool.query(queryText, queryParams);
      const queryEndTime = Date.now();
      const queryExecutionTime = queryEndTime - queryStartTime;
      
      // Note: pool.query() inclut l'attente du pool + l'exécution SQL
      // On ne peut pas les séparer facilement, donc queryExecutionTime inclut les deux
      
      // Étape 4: Traitement des résultats
      const processStartTime = Date.now();
      const rows = result.rows;
      const processTime = Date.now() - processStartTime;
      
      const totalTime = Date.now() - totalStartTime;
      
      // Log détaillé des performances
      console.log(`✅ [SQL:${queryId}] Terminé en ${totalTime}ms`);
      console.log(`   📊 Détails:`);
      console.log(`      - Construction requête: ${queryBuildTime}ms`);
      console.log(`      - Pool check: ${poolCheckTime}ms`);
      console.log(`      - Pool + Exécution SQL: ${queryExecutionTime}ms (inclut attente pool)`);
      console.log(`      - Traitement résultats: ${processTime}ms`);
      console.log(`      - Total: ${totalTime}ms`);
      console.log(`   📈 Résultat: ${rows.length} lignes`);
      console.log(`   🔍 Pool stats: ${poolStats.totalCount} total, ${poolStats.idleCount} idle, ${poolStats.waitingCount} waiting`);
      
      // Avertissement si la requête est lente ou risque de timeout Vercel
      const timeoutWarningThreshold = queryTimeout * 0.8; // 80% du timeout configuré
      const criticalThreshold = queryTimeout * 0.9; // 90% du timeout configuré
      
      if (queryExecutionTime > criticalThreshold) {
        console.error(`🚨 [SQL:${queryId}] REQUÊTE CRITIQUE - Proche du timeout (${queryExecutionTime}ms / ${queryTimeout}ms)`);
        console.error(`   ⚠️  Risque de timeout Vercel (${VERCEL_MAX_DURATION}s max)`);
        if (poolStats.waitingCount > 0) {
          console.error(`   💡 ${poolStats.waitingCount} requêtes en attente - considérer augmenter DB_MAX_CONNECTIONS`);
        }
      } else if (queryExecutionTime > timeoutWarningThreshold) {
        console.warn(`⚠️  [SQL:${queryId}] Requête lente - Proche du timeout (${queryExecutionTime}ms / ${queryTimeout}ms)`);
      } else if (queryExecutionTime > 1000) {
        console.warn(`⚠️  [SQL:${queryId}] Requête lente (>1s): ${queryExecutionTime}ms`);
        if (poolStats.waitingCount > 0) {
          console.warn(`   💡 ${poolStats.waitingCount} requêtes en attente - considérer augmenter DB_MAX_CONNECTIONS`);
        }
      }
      if (queryExecutionTime > 100 && queryExecutionTime <= 1000) {
        console.warn(`⚠️  [SQL:${queryId}] Requête modérément lente (>100ms): ${queryExecutionTime}ms`);
      }
      if (totalTime > 2000) {
        console.warn(`⚠️  [SQL:${queryId}] Requête très lente (>2s): ${totalTime}ms`);
      }
      
      return rows;
    } catch (error) {
      const totalTime = Date.now() - totalStartTime;
      
      // Log d'erreur détaillé
      console.error(`❌ [SQL:${queryId}] Erreur après ${totalTime}ms`);
      console.error(`   Message: ${error.message}`);
      if (error.code) {
        console.error(`   Code: ${error.code}`);
      }
      if (error.position) {
        console.error(`   Position: ${error.position}`);
      }
      if (error.hint) {
        console.error(`   Hint: ${error.hint}`);
      }
      console.error(`   Requête: ${queryPreview}`);
      
      throw error;
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

