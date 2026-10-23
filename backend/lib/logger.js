/**
 * Système de logging pour TeachDigital Backend
 * Écrit à la fois sur stdout/stderr (pour Docker) et dans des fichiers.
 *
 * - Fichiers écrits via des flux (fs.createWriteStream) : aucune écriture synchrone par ligne.
 * - Rotation par taille (LOG_MAX_SIZE, LOG_MAX_FILES) au moment où le seuil est franchi.
 * - Données sensibles masquées avant écriture (PIN, jetons, clés API, mots de passe,
 *   texte OCR des devoirs...) : voir maskSensitive().
 */

const fs = require('fs');
const path = require('path');
const { loadBackendEnv } = require('./loadEnv.js');

// Charger l'environnement tôt (prod: `.env` uniquement, dev: `.env` puis `env`)
loadBackendEnv();

const MASK = '[MASQUÉ]';
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 4000;

// Noms de champs dont la valeur ne doit jamais apparaître dans les logs
// (comparaison sur le nom normalisé : minuscules, sans « _ », « - » ni espaces)
const SENSITIVE_KEY_SUFFIXES = ['pin', 'pincode', 'pinhash', 'password', 'passwd', 'token', 'secret', 'extractedtext', 'ocrtext'];
const SENSITIVE_KEY_PARTS = ['apikey', 'authorization', 'cookie', 'secret', 'password', 'privatekey', 'imagedata', 'base64'];

function isSensitiveKey(key) {
  const normalized = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return false;
  if (SENSITIVE_KEY_SUFFIXES.some(suffix => normalized.endsWith(suffix))) return true;
  return SENSITIVE_KEY_PARTS.some(part => normalized.includes(part));
}

// Secrets reconnaissables dans un texte libre (message d'erreur, URL...)
const SECRET_PATTERNS = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${MASK}`],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+/g, MASK],
  [/\bsk-[A-Za-z0-9_-]{8,}/g, MASK],
  [/\bAIza[0-9A-Za-z_-]{20,}/g, MASK],
  [/\bgsk_[A-Za-z0-9]{10,}/g, MASK],
  [/([?&](?:key|api_key|apikey|token|access_token)=)[^&\s"']+/gi, `$1${MASK}`],
  [/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/gi, '$1****@']
];

function maskString(value) {
  let text = String(value);
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  if (text.length > MAX_STRING_LENGTH) {
    text = `${text.slice(0, MAX_STRING_LENGTH)}… (${text.length} caractères)`;
  }
  return text;
}

function serializeError(error, depth, seen) {
  const result = {
    name: error.name,
    message: maskString(error.message || ''),
    ...(error.code !== undefined ? { code: error.code } : {})
  };
  if (error.stack) result.stack = maskString(error.stack);
  if (error.cause && depth < MAX_DEPTH) result.cause = sanitize(error.cause, depth + 1, seen);
  return result;
}

function sanitize(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return maskString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return typeof value === 'function' ? '[fonction]' : value;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} octets]`;
  if (seen.has(value)) return '[circulaire]';
  if (depth >= MAX_DEPTH) return '[…]';
  seen.add(value);

  if (value instanceof Error) return serializeError(value, depth, seen);

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map(item => sanitize(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) items.push(`… (${value.length - MAX_ARRAY_ITEMS} éléments de plus)`);
    return items;
  }

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = isSensitiveKey(key) && item !== null && item !== undefined && item !== ''
      ? MASK
      : sanitize(item, depth + 1, seen);
  }
  return result;
}

/**
 * Masque les données sensibles d'un message ou d'un objet de log.
 * @param {*} value - Texte, objet, tableau ou Error
 * @returns {*} Copie masquée (les objets d'origine ne sont pas modifiés)
 */
function maskSensitive(value) {
  return sanitize(value);
}

class Logger {
  constructor() {
    // Normaliser les variables d'environnement (évite les \r des fichiers .env en CRLF)
    const envStr = (key, fallback = undefined) => {
      const val = process.env[key];
      if (val === undefined || val === null || val === '') return fallback;
      return typeof val === 'string' ? val.trim() : val;
    };

    const envInt = (key, fallback) => {
      const raw = envStr(key, undefined);
      const n = raw != null ? parseInt(String(raw), 10) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };

    // Chemin du dossier logs - utiliser /logs en Docker par défaut
    // En développement, utiliser le dossier logs/ local
    // En Docker, utiliser un volume monté à /logs
    const isDocker = envStr('DOCKER_ENV') === 'true' || envStr('NODE_ENV') === 'production';
    const defaultLogsDir = isDocker ? '/logs' : path.join(__dirname, '..', 'logs');
    this.logsDir = envStr('LOGS_DIR', defaultLogsDir);

    // En dev local, éviter /logs (réservé au volume Docker) qui échoue souvent en permissions
    if (!isDocker && this.logsDir === '/logs') {
      this.logsDir = defaultLogsDir;
    }

    // Créer le dossier logs s'il n'existe pas (une seule fois, au démarrage)
    const ensureLogsDir = (dir) => {
      if (!dir) return false;
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Dossier logs créé: ${dir}`);
        }
        return true;
      } catch (error) {
        console.error('❌ Erreur lors de la création du dossier logs:', error.message);
        return false;
      }
    };

    // 1) Essayer le dossier configuré
    let logsOk = ensureLogsDir(this.logsDir);

    // 2) En dev, fallback automatique sur un dossier local si /logs n'est pas accessible
    if (!logsOk && !isDocker) {
      const fallbackDir = path.join(__dirname, '..', 'logs');
      if (fallbackDir !== this.logsDir) {
        logsOk = ensureLogsDir(fallbackDir);
        if (logsOk) {
          this.logsDir = fallbackDir;
          console.warn(`⚠️  LOGS_DIR non accessible, fallback sur: ${this.logsDir}`);
        }
      }
    }

    // 3) Si on ne peut toujours pas, désactiver l'écriture fichier
    if (!logsOk) {
      this.logsDir = null;
    }

    // Configuration de la rotation des logs
    this.maxFileSize = envInt('LOG_MAX_SIZE', 10 * 1024 * 1024); // 10MB par défaut
    this.maxFiles = envInt('LOG_MAX_FILES', 5); // 5 fichiers par défaut

    // Activer/désactiver l'écriture fichier
    this.enableFileLogging = envStr('LOG_ENABLE_FILE') !== 'false' && this.logsDir !== null;

    // Activer/désactiver les logs détaillés
    this.enableDebug = envStr('LOG_DEBUG') === 'true';

    // Format de log: "text" (par défaut) ou "json"
    // En production, "json" est recommandé (facile à parser / agréger)
    this.logFormat = String(envStr('LOG_FORMAT', 'text')).toLowerCase();

    // Flux d'écriture ouverts, par fichier de niveau (info, warn, error, debug)
    this.streams = new Map();
    this.closed = false;

    // Exposer les propriétés publiques
    this.logsDirectory = this.logsDir;
  }

  /**
   * Formate un message de log avec timestamp
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  /**
   * Formate un log en JSON (recommandé en production)
   */
  formatJson(level, message, data = null) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: String(level || 'INFO').toUpperCase(),
      message: String(message || ''),
      ...(data && typeof data === 'object' && !Array.isArray(data) ? data : (data != null ? { data } : {}))
    };
    return JSON.stringify(payload);
  }

  format(level, message, data) {
    return this.logFormat === 'json'
      ? this.formatJson(level, message, data)
      : this.formatMessage(level, message, data);
  }

  /**
   * Écrit un log sur stdout/stderr selon le niveau, en text ou json
   */
  writeToStd(level, message, data = null) {
    const upper = String(level || 'INFO').toUpperCase();
    const formatted = this.format(upper, message, data);

    if (upper === 'ERROR') {
      console.error(formatted);
    } else if (upper === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Désactive l'écriture fichier (permissions, disque plein...) en le signalant une seule fois
   */
  disableFileLogging(reason) {
    if (!this.enableFileLogging) return;
    this.enableFileLogging = false;
    for (const entry of this.streams.values()) {
      entry.stream.destroy();
    }
    this.streams.clear();
    console.error(`⚠️  Écriture des logs dans ${this.logsDir} désactivée : ${reason}`);
  }

  createStream(level, file) {
    const stream = fs.createWriteStream(file, { flags: 'a', encoding: 'utf8' });
    stream.on('error', (error) => {
      if (error.code === 'EACCES' || error.code === 'EPERM' || error.code === 'EROFS' || error.code === 'ENOSPC') {
        this.disableFileLogging(`${error.code} sur ${file}`);
      } else {
        console.error('❌ Erreur lors de l\'écriture dans le fichier de log:', error.message);
        this.streams.delete(level);
      }
    });
    return stream;
  }

  /**
   * Flux d'écriture du fichier d'un niveau (ouvert à la demande)
   */
  getStream(level) {
    const existing = this.streams.get(level);
    if (existing) return existing;

    const file = path.join(this.logsDir, `${level}.log`);
    let size = 0;
    try {
      // Taille lue une fois à l'ouverture du flux (pas à chaque ligne)
      size = fs.statSync(file).size;
    } catch {
      size = 0;
    }
    if (size >= this.maxFileSize) {
      // Fichier pas encore ouvert par ce processus : rotation immédiate possible
      this.rotateLogFile(file);
      size = 0;
    }

    const entry = { stream: this.createStream(level, file), size, file, pending: null, rotation: null };
    this.streams.set(level, entry);
    return entry;
  }

  /**
   * Rotation : on attend que l'ancien flux ait tout écrit et fermé le fichier avant de le
   * renommer (le flux s'ouvre de manière asynchrone, et Windows refuse de renommer un
   * fichier ouvert). Les lignes reçues entre-temps sont mises en attente puis écrites.
   */
  startRotation(level, entry) {
    entry.pending = [];
    const oldStream = entry.stream;
    entry.rotation = new Promise((resolve) => {
      oldStream.once('close', () => {
        this.rotateLogFile(entry.file);
        const lines = entry.pending;
        entry.pending = null;
        entry.rotation = null;
        if (this.enableFileLogging) {
          entry.stream = this.createStream(level, entry.file);
          entry.size = 0;
          // Même chemin que les écritures normales : une nouvelle rotation peut démarrer
          for (const line of lines) this.writeLine(level, entry, line);
        }
        resolve();
      });
      oldStream.end();
    });
  }

  writeLine(level, entry, line) {
    if (entry.pending) {
      entry.pending.push(line);
      return;
    }
    const bytes = Buffer.byteLength(line);
    if (entry.size > 0 && entry.size + bytes > this.maxFileSize) {
      this.startRotation(level, entry);
      entry.pending.push(line);
      return;
    }
    entry.size += bytes;
    entry.stream.write(line);
  }

  /**
   * Écrit dans un fichier de log (asynchrone, via un flux)
   */
  writeToFile(level, message, data = null) {
    if (!this.enableFileLogging || this.closed) return;

    try {
      const line = `${this.format(level, message, data)}\n`;
      this.writeLine(level, this.getStream(level), line);
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        this.disableFileLogging(error.code);
      } else {
        console.error('❌ Erreur lors de l\'écriture dans le fichier de log:', error.message);
      }
    }
  }

  /**
   * Fait une rotation du fichier de log (rare : uniquement quand le seuil est franchi)
   */
  rotateLogFile(logFile) {
    try {
      const baseName = path.basename(logFile, '.log');
      const dir = path.dirname(logFile);

      // Déplacer les anciens fichiers
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}.log`);
        const newFile = path.join(dir, `${baseName}.${i + 1}.log`);

        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            // Supprimer le plus ancien fichier
            fs.unlinkSync(oldFile);
          } else {
            // Renommer le fichier
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Renommer le fichier actuel
      if (fs.existsSync(logFile)) {
        fs.renameSync(logFile, path.join(dir, `${baseName}.1.log`));
      }
    } catch (error) {
      console.error('❌ Erreur lors de la rotation du fichier de log:', error.message);
    }
  }

  /**
   * Point d'entrée commun : masquage puis écriture console + fichier
   */
  emit(stdLevel, fileLevel, message, data) {
    const safeMessage = maskString(message ?? '');
    const safeData = data === null || data === undefined ? null : sanitize(data);
    this.writeToStd(stdLevel, safeMessage, safeData);
    this.writeToFile(fileLevel, safeMessage, safeData);
  }

  /**
   * Log info
   */
  info(message, data = null) {
    this.emit('INFO', 'info', message, data);
  }

  /**
   * Log error
   * @param {string} message
   * @param {Error|Object|string} [error] - Erreur, ou objet de contexte ({ requestId, error, ... })
   */
  error(message, error = null) {
    let errorData = null;
    if (error instanceof Error) {
      errorData = {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code
      };
    } else if (error && typeof error === 'object') {
      errorData = error;
    } else if (error !== null && error !== undefined) {
      errorData = { error };
    }
    this.emit('ERROR', 'error', message, errorData);
  }

  /**
   * Log warn
   */
  warn(message, data = null) {
    this.emit('WARN', 'warn', message, data);
  }

  /**
   * Log debug (seulement si LOG_DEBUG=true)
   */
  debug(message, data = null) {
    if (!this.enableDebug) return;
    this.emit('DEBUG', 'debug', message, data);
  }

  /**
   * Log avec niveau personnalisé
   */
  log(level, message, data = null) {
    this.emit(level, String(level).toLowerCase(), message, data);
  }

  /**
   * Log HTTP (requêtes entrantes) - format standardisé
   */
  http(message, data = null) {
    this.emit('INFO', 'info', message, { category: 'http', ...(data || {}) });
  }

  /**
   * Termine les flux fichiers (arrêt du serveur) : les lignes en attente sont écrites.
   * Les logs suivants ne vont plus que sur stdout/stderr.
   * @returns {Promise<void>}
   */
  close() {
    // Plus aucune nouvelle ligne acceptée ; celles déjà reçues (y compris en attente
    // d'une rotation) sont écrites avant la fermeture
    this.closed = true;
    const entries = [...this.streams.values()];
    this.streams.clear();
    return Promise.all(entries.map(async (entry) => {
      // Rotation(s) en cours : laisser le nouveau flux recevoir les lignes en attente
      while (entry.rotation) await entry.rotation;
      await new Promise(resolve => {
        if (entry.stream.destroyed || entry.stream.writableFinished) return resolve();
        entry.stream.end(resolve);
      });
    })).then(() => undefined);
  }
}

// Instance singleton
const logger = new Logger();

// Exporter l'instance et la classe
module.exports = logger;
module.exports.Logger = Logger;
module.exports.maskSensitive = maskSensitive;
