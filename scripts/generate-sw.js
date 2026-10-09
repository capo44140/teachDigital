#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Génère dist/sw.js à partir de public/sw.js en y injectant la version de build.
 * C'est le seul générateur de Service Worker (vite-plugin-pwa n'est plus utilisé).
 *
 * La version provient de dist/version.json, écrit pendant `vite build` par le plugin
 * de vite.config.js : le Service Worker, version.json et __APP_VERSION__ partagent
 * ainsi la même valeur.
 */

const BUILD_VERSION_PATTERN = /const BUILD_VERSION = '[^']*';/;

function readBuildVersion(distDir) {
  const versionFile = path.join(distDir, 'version.json');
  try {
    const info = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    if (info.build) return String(info.build);
    if (info.version) return `${info.version}-${info.buildNumber || Date.now()}`;
  } catch (error) {
    console.warn(`⚠️ ${versionFile} illisible (${error.message}) : version déduite de package.json`);
  }
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return `${packageJson.version}-${Date.now()}`;
}

function generateServiceWorker({ publicDir = 'public', distDir = 'dist' } = {}) {
  try {
    if (!fs.existsSync(distDir)) {
      throw new Error(`Dossier ${distDir} introuvable : lancez d'abord "vite build"`);
    }

    const buildVersion = readBuildVersion(distDir);

    // Lire le template du service worker
    const swTemplate = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
    if (!BUILD_VERSION_PATTERN.test(swTemplate)) {
      throw new Error('Ligne "const BUILD_VERSION = \'...\';" introuvable dans public/sw.js');
    }

    // Remplacer la version de développement par la version de build
    const swContent = swTemplate.replace(
      BUILD_VERSION_PATTERN,
      `const BUILD_VERSION = 'teachdigital-v${buildVersion}';`
    );

    // Écrire le service worker généré
    const output = path.join(distDir, 'sw.js');
    fs.writeFileSync(output, swContent);

    console.log(`✅ Service Worker généré avec la version: ${buildVersion}`);
    console.log(`📦 Fichier créé: ${output}`);
    return buildVersion;
  } catch (error) {
    console.error('❌ Erreur lors de la génération du service worker:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement (pathToFileURL : compatible Windows)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  generateServiceWorker();
}

export { generateServiceWorker };
