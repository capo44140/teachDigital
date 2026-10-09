const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { loadBackendEnv } = require('./loadEnv.js');

// Charger les variables d'environnement (prod: `.env` uniquement, dev: `.env` puis `env`)
loadBackendEnv();

// Configuration de la connexion PostgreSQL
// Supporte deux méthodes : variables séparées ou DATABASE_URL

// Configuration des timeouts pour les requêtes SQL
// Timeout par défaut: 30s (peut être modifié via DB_QUERY_TIMEOUT_MS)
const DEFAULT_QUERY_TIMEOUT_MS = parseInt(process.env.DB_QUERY_TIMEOUT_MS) || 30000;

// Mode silencieux pour la production (pas de logs détaillés)
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const ENABLE_SQL_LOGS = process.env.DB_ENABLE_LOGS === 'true' || IS_DEVELOPMENT;

// Timeout pour les requêtes SQL
const queryTimeout = DEFAULT_QUERY_TIMEOUT_MS;

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
    min: 0, // Pas de connexions au démarrage (lazy connection) pour éviter les timeouts
    idleTimeoutMillis: 30000, // 30 secondes avant de fermer une connexion inactive
    connectionTimeoutMillis: 1000, // 1 seconde max pour établir une connexion (optimisé pour Vercel)
    statement_timeout: queryTimeout, // Timeout adaptatif selon plan Vercel
    query_timeout: queryTimeout, // Timeout adaptatif selon plan Vercel
    keepAlive: true,
    keepAliveInitialDelayMillis: 3000 // Réduit à 3s pour connexion plus rapide
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
    min: 0, // Pas de connexions au démarrage (lazy connection) pour éviter les timeouts
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 1000, // 1 seconde max pour établir une connexion (optimisé pour Vercel)
    statement_timeout: queryTimeout, // Timeout adaptatif selon plan Vercel
    query_timeout: queryTimeout, // Timeout adaptatif selon plan Vercel
    keepAlive: true,
    keepAliveInitialDelayMillis: 3000 // Réduit à 3s pour connexion plus rapide
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

  // Listeners pour gérer les erreurs de connexion (uniquement en dev ou si logs activés)
  if (ENABLE_SQL_LOGS) {
    pool.on('connect', () => {
      // Log silencieux en production pour performance
    });
  }

  pool.on('error', (error) => {
    // Toujours logger les erreurs critiques
    console.error('❌ ERREUR CRITIQUE de connexion PostgreSQL:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    if (ENABLE_SQL_LOGS) {
      console.error('   Host:', error.host || 'undefined');
      console.error('   Port:', error.port || 'undefined');
    }
  });
} catch (error) {
  console.error('❌ Erreur de configuration PostgreSQL:', error);
  console.error('💡 Vérifiez que les variables d\'environnement sont correctement configurées');
  throw error;
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
console.log('   - Connect Timeout: 1s (optimisé pour Vercel)');
console.log('   - Idle Timeout: 30s');
console.log(`   - Statement Timeout: ${queryTimeout}ms`);
console.log(`   - Query Timeout: ${queryTimeout}ms`);
console.log('   - Max Connections: ' + (parseInt(process.env.DB_MAX_CONNECTIONS) || 10));
console.log('   - Min Connections: 0 (lazy connection - pas de connexions au démarrage)');
console.log('   - Keep-Alive: enabled (3s initial delay)');
console.log('   - Retry automatique: enabled (2x max, délai 500ms)');
console.log(`   - 📊 Logs SQL: ${ENABLE_SQL_LOGS ? 'activés' : 'désactivés'} (performance optimisée)`);
console.log('═══════════════════════════════════════════════════════════');

// Fonction wrapper pour exécuter des requêtes avec retry automatique
// Utilise 2 retries max avec délai de 500ms entre chaque tentative
async function executeWithRetry(queryFn, maxRetries = 2, delayMs = 500) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (ENABLE_SQL_LOGS && attempt > 1) {
        console.log(`📤 Tentative ${attempt}/${maxRetries} de connexion à la base de données...`);
      }
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
        // Erreur permanente ou dernier essai - toujours logger les erreurs
        console.error(`❌ ERREUR FINALE après ${attempt} tentatives:`, {
          code: error.code,
          message: error.message,
          isTemporaryError
        });
        throw error;
      }

      // Attendre avant de réessayer (délai fixe plus court pour éviter timeout)
      if (ENABLE_SQL_LOGS) {
        console.log(`⏳ Retry ${attempt}/${maxRetries} après ${delayMs}ms`);
        console.log(`   Erreur: ${error.code} - ${error.message?.substring(0, 100)}`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
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

      // Log de débogage uniquement si logs activés
      if (ENABLE_SQL_LOGS && value instanceof SqlQuery) {
        console.log(`🔍 [SQL Builder] Requête imbriquée détectée à l'index ${i}`);
      }

      if (value instanceof SqlIdentifier) {
        // Les identifiants sont intégrés directement (pas de paramètre)
        result += value.value;
      } else if (value instanceof SqlQuery) {
        // Seul un fragment construit par sql`...` peut être imbriqué : un objet
        // { text, params } venant d'une requête HTTP (req.body) reste un simple paramètre,
        // sinon son texte serait injecté tel quel dans la requête (injection SQL).
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
  }, "");

  return { text, params: params_array };
}

// Créer une fonction sql compatible avec l'API postgres et template literals
function sql(strings, ...values) {
  // Mesurer le temps de construction uniquement si logs activés
  const buildStartTime = ENABLE_SQL_LOGS ? Date.now() : 0;

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

  const buildTime = ENABLE_SQL_LOGS ? Date.now() - buildStartTime : 0;

  // Créer un objet qui peut être utilisé dans d'autres templates ET awaité
  // Ne PAS exécuter immédiatement - seulement quand on await
  const queryText = query.text;
  const queryParams = query.params;

  // Log si la construction prend du temps (uniquement si logs activés)
  if (ENABLE_SQL_LOGS && buildTime > 5) {
    console.log(`🔧 [SQL Builder] Construction requête: ${buildTime}ms`);
  }

  // Stocker buildTime pour l'utiliser dans les logs d'exécution
  const queryBuildTime = buildTime;

  // Créer une Promise qui sera exécutée seulement quand on await
  const executeQuery = async () => {
    // Mesurer le temps uniquement si logs activés ou si on doit vérifier les timeouts
    const totalStartTime = ENABLE_SQL_LOGS ? Date.now() : 0;
    const queryId = ENABLE_SQL_LOGS ? Math.random().toString(36).substring(2, 9) : '';
    const queryPreview = ENABLE_SQL_LOGS ? (queryText.length > 100 ? queryText.substring(0, 100) + '...' : queryText) : '';

    // Log de début uniquement si logs activés
    if (ENABLE_SQL_LOGS) {
      console.log(`🚀 [SQL:${queryId}] Début - ${queryPreview}`);
      if (queryBuildTime > 1) {
        console.log(`   🔧 Construction: ${queryBuildTime}ms`);
      }
    }

    try {
      // Étape 1: Vérifier l'état du pool uniquement si logs activés ou si nécessaire
      let poolStats = null;
      let poolCheckTime = 0;
      if (ENABLE_SQL_LOGS) {
        const poolCheckStart = Date.now();
        poolStats = {
          totalCount: pool.totalCount || 0,
          idleCount: pool.idleCount || 0,
          waitingCount: pool.waitingCount || 0
        };
        poolCheckTime = Date.now() - poolCheckStart;

        if (poolCheckTime > 1) {
          console.log(`⏱️  [SQL:${queryId}] Pool check: ${poolCheckTime}ms`, poolStats);
        }

        if (poolStats.waitingCount > 0) {
          console.warn(`⚠️  [SQL:${queryId}] ${poolStats.waitingCount} requêtes en attente dans le pool`);
        }
      }

      // Étape 2: Exécution de la requête avec timeout global pour éviter les blocages
      // On mesure toujours le temps pour détecter les problèmes critiques, même sans logs
      if (ENABLE_SQL_LOGS) {
        console.log(`▶️  [SQL:${queryId}] Exécution de la requête...`);
      }
      const queryStartTime = Date.now(); // Toujours mesurer pour détecter les problèmes

      // Timeout global pour éviter que la requête bloque indéfiniment
      // On utilise 90% du timeout configuré pour laisser une marge
      const globalTimeout = Math.max(queryTimeout * 0.9, 5000); // Minimum 5s

      const queryPromise = pool.query(queryText, queryParams);
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Query timeout après ${globalTimeout}ms (limite: ${queryTimeout}ms)`));
        }, globalTimeout);
      });

      let result;
      try {
        result = await Promise.race([queryPromise, timeoutPromise]);
      } catch (error) {
        // Si c'est un timeout, logger et relancer
        if (error.message.includes('timeout')) {
          console.error(`⏱️  [SQL${queryId ? ':' + queryId : ''}] Timeout global déclenché après ${globalTimeout}ms`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      const queryEndTime = Date.now();
      const queryExecutionTime = queryEndTime - queryStartTime;

      // Note: pool.query() inclut l'attente du pool + l'exécution SQL
      // On ne peut pas les séparer facilement, donc queryExecutionTime inclut les deux

      // Étape 3: Traitement des résultats (très rapide, pas besoin de mesurer en prod)
      const rows = result.rows;
      const totalTime = ENABLE_SQL_LOGS ? Date.now() - totalStartTime : 0;

      // Log détaillé des performances uniquement si logs activés
      if (ENABLE_SQL_LOGS) {
        console.log(`✅ [SQL:${queryId}] Terminé en ${totalTime}ms`);
        console.log(`   📊 Détails:`);
        console.log(`      - Construction requête: ${queryBuildTime}ms`);
        console.log(`      - Pool check: ${poolCheckTime}ms`);
        console.log(`      - Pool + Exécution SQL: ${queryExecutionTime}ms (inclut attente pool)`);
        console.log(`      - Total: ${totalTime}ms`);
        console.log(`   📈 Résultat: ${rows.length} lignes`);
        if (poolStats) {
          console.log(`   🔍 Pool stats: ${poolStats.totalCount} total, ${poolStats.idleCount} idle, ${poolStats.waitingCount} waiting`);
        }
      }

      // Avertissements critiques - toujours vérifier même sans logs détaillés
      const timeoutWarningThreshold = queryTimeout * 0.8; // 80% du timeout configuré
      const criticalThreshold = queryTimeout * 0.9; // 90% du timeout configuré

      if (queryExecutionTime > criticalThreshold) {
        console.error(`🚨 [SQL${queryId ? ':' + queryId : ''}] REQUÊTE CRITIQUE - Proche du timeout (${queryExecutionTime}ms / ${queryTimeout}ms)`);
        if (ENABLE_SQL_LOGS && poolStats && poolStats.waitingCount > 0) {
          console.error(`   💡 ${poolStats.waitingCount} requêtes en attente - considérer augmenter DB_MAX_CONNECTIONS`);
        }
      } else if (ENABLE_SQL_LOGS) {
        // Autres avertissements uniquement si logs activés
        if (queryExecutionTime > timeoutWarningThreshold) {
          console.warn(`⚠️  [SQL:${queryId}] Requête lente - Proche du timeout (${queryExecutionTime}ms / ${queryTimeout}ms)`);
        } else if (queryExecutionTime > 1000) {
          console.warn(`⚠️  [SQL:${queryId}] Requête lente (>1s): ${queryExecutionTime}ms`);
          if (poolStats && poolStats.waitingCount > 0) {
            console.warn(`   💡 ${poolStats.waitingCount} requêtes en attente - considérer augmenter DB_MAX_CONNECTIONS`);
          }
        }
        if (queryExecutionTime > 100 && queryExecutionTime <= 1000) {
          console.warn(`⚠️  [SQL:${queryId}] Requête modérément lente (>100ms): ${queryExecutionTime}ms`);
        }
        if (totalTime > 2000) {
          console.warn(`⚠️  [SQL:${queryId}] Requête très lente (>2s): ${totalTime}ms`);
        }
      }

      return rows;
    } catch (error) {
      // Toujours logger les erreurs, même sans logs détaillés
      const totalTime = ENABLE_SQL_LOGS ? Date.now() - totalStartTime : 0;

      console.error(`❌ [SQL${queryId ? ':' + queryId : ''}] Erreur${totalTime > 0 ? ` après ${totalTime}ms` : ''}`);
      console.error(`   Message: ${error.message}`);
      if (error.code) {
        console.error(`   Code: ${error.code}`);
      }
      if (ENABLE_SQL_LOGS) {
        if (error.position) {
          console.error(`   Position: ${error.position}`);
        }
        if (error.hint) {
          console.error(`   Hint: ${error.hint}`);
        }
        if (queryPreview) {
          console.error(`   Requête: ${queryPreview}`);
        }
      }

      throw error;
    }
  };

  return new SqlQuery(queryText, queryParams, executeQuery);
}

// Requête paresseuse : rien n'est exécuté tant qu'on ne fait pas await / then().
// Ce n'est volontairement PAS une Promise native : « await » sur une Promise native
// ignore un then() surchargé et attendrait indéfiniment. Ici, await appelle bien then().
// L'exécution est mémorisée : plusieurs then() ne relancent pas la requête.
class SqlQuery {
  constructor (text, params, execute) {
    this.text = text;
    this.params = params;
    Object.defineProperty(this, '_execute', { value: execute });
    Object.defineProperty(this, '_promise', { value: null, writable: true });
  }

  _run () {
    if (!this._promise) {
      this._promise = this._execute();
    }
    return this._promise;
  }

  then (resolve, reject) {
    return this._run().then(resolve, reject);
  }

  catch (reject) {
    return this._run().catch(reject);
  }

  finally (callback) {
    return this._run().finally(callback);
  }
}

// Ajouter une méthode sql(identifier) pour créer des identifiants
sql.identifier = function (value) {
  return new SqlIdentifier(value);
};

// Stocker le pool sur la fonction pour accès direct
sql.pool = pool;

module.exports = {
  default: sql,
  pool,
  sql,
  SqlQuery,
  buildQuery,
  executeWithRetry,
  query: (text, params) => pool.query(text, params)
};

