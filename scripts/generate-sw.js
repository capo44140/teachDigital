#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Script pour générer le service worker avec version dynamique
 * Ce script s'exécute lors du build pour injecter la version actuelle
 */

function generateServiceWorker() {
  try {
    // Lire la version depuis package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    
    // Lire le template du service worker
    const swTemplate = fs.readFileSync('public/sw.js', 'utf8');
    
    // Remplacer la version statique par la version dynamique
    const swContent = swTemplate.replace(
      /const BUILD_VERSION = 'teachdigital-v' \+ new Date\(\)\.getTime\(\);/,
      `const BUILD_VERSION = 'teachdigital-v${version}-${Date.now()}';`
    );
    
    // Écrire le service worker généré
    fs.writeFileSync('dist/sw.js', swContent);
    
    console.log(`✅ Service Worker généré avec la version: ${version}`);
    console.log(`📦 Fichier créé: dist/sw.js`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du service worker:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  generateServiceWorker();
}

export { generateServiceWorker };
