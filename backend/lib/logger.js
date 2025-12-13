/**
 * Système de logging pour TeachDigital Backend
 * Écrit à la fois sur stdout/stderr (pour Docker) et dans des fichiers
 */

const fs = require('fs');
const path = require('path');
const { loadBackendEnv } = require('./loadEnv.js');

// Charger l'environnement tôt (prod: `.env` uniquement, dev: `.env` puis `env`)
loadBackendEnv();

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
    
    // Créer le dossier logs s'il n'existe pas
    const ensureLogsDir = (dir) => {
      if (!dir) return false;
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Dossier logs créé: ${dir}`);
        }
        return true;
      } catch (error) {
        console.error('❌ Erreur lors de la création du dossier logs:', error);
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
      ...(data && typeof data === 'object' ? data : (data != null ? { data } : {}))
    };
    return JSON.stringify(payload);
  }

  /**
   * Écrit un log sur stdout/stderr selon le niveau, en text ou json
   */
  writeToStd(level, message, data = null) {
    const upper = String(level || 'INFO').toUpperCase();
    const formatted = this.logFormat === 'json'
      ? this.formatJson(upper, message, data)
      : this.formatMessage(upper, message, data);

    if (upper === 'ERROR') {
      console.error(formatted);
    } else if (upper === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Écrit dans un fichier de log
   */
  writeToFile(level, message, data = null) {
    if (!this.enableFileLogging) return;

    try {
      const logFile = path.join(this.logsDir, `${level}.log`);
      const formattedMessage = this.logFormat === 'json'
        ? this.formatJson(level, message, data)
        : this.formatMessage(level, message, data);
      
      // Vérifier la taille du fichier et faire une rotation si nécessaire
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(logFile);
        }
      }
      
      // Écrire dans le fichier
      fs.appendFileSync(logFile, formattedMessage + '\n', 'utf8');
    } catch (error) {
      // Si erreur de permissions, désactiver l'écriture fichier pour cette session
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        // Désactiver l'écriture fichier pour éviter de répéter l'erreur
        this.enableFileLogging = false;
        // Logger une seule fois sur stderr (qui fonctionne toujours)
        if (!this._permissionErrorLogged) {
          console.error(`⚠️  Écriture fichier désactivée: permissions insuffisantes sur ${this.logsDir}`);
          this._permissionErrorLogged = true;
        }
      } else {
        // Pour les autres erreurs, logger mais continuer
        console.error('❌ Erreur lors de l\'écriture dans le fichier de log:', error.message);
      }
    }
  }

  /**
   * Fait une rotation du fichier de log
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
      const firstBackup = path.join(dir, `${baseName}.1.log`);
      fs.renameSync(logFile, firstBackup);
    } catch (error) {
      console.error('❌ Erreur lors de la rotation du fichier de log:', error);
    }
  }

  /**
   * Log info
   */
  info(message, data = null) {
    this.writeToStd('INFO', message, data);
    this.writeToFile('info', message, data);
  }

  /**
   * Log error
   */
  error(message, error = null) {
    const errorData = error
      ? (typeof error === 'object'
        ? {
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name,
          errorCode: error.code
        }
        : { error })
      : null;

    this.writeToStd('ERROR', message, errorData);
    this.writeToFile('error', message, errorData);
  }

  /**
   * Log warn
   */
  warn(message, data = null) {
    this.writeToStd('WARN', message, data);
    this.writeToFile('warn', message, data);
  }

  /**
   * Log debug (seulement si LOG_DEBUG=true)
   */
  debug(message, data = null) {
    if (!this.enableDebug) return;
    
    this.writeToStd('DEBUG', message, data);
    this.writeToFile('debug', message, data);
  }

  /**
   * Log avec niveau personnalisé
   */
  log(level, message, data = null) {
    this.writeToStd(level, message, data);
    this.writeToFile(level.toLowerCase(), message, data);
  }

  /**
   * Log HTTP (requêtes entrantes) - format standardisé
   */
  http(message, data = null) {
    this.writeToStd('INFO', message, { category: 'http', ...(data || {}) });
    this.writeToFile('info', message, { category: 'http', ...(data || {}) });
  }
}

// Instance singleton
const logger = new Logger();

// Exporter l'instance et la classe
module.exports = logger;
module.exports.Logger = Logger;

