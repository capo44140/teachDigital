/**
 * Système de logging pour TeachDigital Backend
 * Écrit à la fois sur stdout/stderr (pour Docker) et dans des fichiers
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    // Chemin du dossier logs
    this.logsDir = process.env.LOGS_DIR || path.join(__dirname, '..', 'logs');
    
    // Créer le dossier logs s'il n'existe pas
    if (!fs.existsSync(this.logsDir)) {
      try {
        fs.mkdirSync(this.logsDir, { recursive: true });
        console.log(`📁 Dossier logs créé: ${this.logsDir}`);
      } catch (error) {
        console.error('❌ Erreur lors de la création du dossier logs:', error);
        // Continuer sans écriture fichier si on ne peut pas créer le dossier
        this.logsDir = null;
      }
    }

    // Configuration de la rotation des logs
    this.maxFileSize = parseInt(process.env.LOG_MAX_SIZE) || 10 * 1024 * 1024; // 10MB par défaut
    this.maxFiles = parseInt(process.env.LOG_MAX_FILES) || 5; // 5 fichiers par défaut
    
    // Activer/désactiver l'écriture fichier
    this.enableFileLogging = process.env.LOG_ENABLE_FILE !== 'false' && this.logsDir !== null;
    
    // Activer/désactiver les logs détaillés
    this.enableDebug = process.env.LOG_DEBUG === 'true';
    
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
   * Écrit dans un fichier de log
   */
  writeToFile(level, message, data = null) {
    if (!this.enableFileLogging) return;

    try {
      const logFile = path.join(this.logsDir, `${level}.log`);
      const formattedMessage = this.formatMessage(level, message, data);
      
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
      // Ne pas bloquer l'application si l'écriture fichier échoue
      console.error('❌ Erreur lors de l\'écriture dans le fichier de log:', error);
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
    const formatted = this.formatMessage('INFO', message, data);
    console.log(formatted);
    this.writeToFile('info', message, data);
  }

  /**
   * Log error
   */
  error(message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : null;
    const formatted = this.formatMessage('ERROR', message, errorData);
    console.error(formatted);
    this.writeToFile('error', message, errorData);
  }

  /**
   * Log warn
   */
  warn(message, data = null) {
    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    this.writeToFile('warn', message, data);
  }

  /**
   * Log debug (seulement si LOG_DEBUG=true)
   */
  debug(message, data = null) {
    if (!this.enableDebug) return;
    
    const formatted = this.formatMessage('DEBUG', message, data);
    console.log(formatted);
    this.writeToFile('debug', message, data);
  }

  /**
   * Log avec niveau personnalisé
   */
  log(level, message, data = null) {
    const formatted = this.formatMessage(level.toUpperCase(), message, data);
    console.log(formatted);
    this.writeToFile(level.toLowerCase(), message, data);
  }
}

// Instance singleton
const logger = new Logger();

// Exporter l'instance et la classe
module.exports = logger;
module.exports.Logger = Logger;

