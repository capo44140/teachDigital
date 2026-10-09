#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

/**
 * Script pour configurer les hooks Git automatiques
 * Usage (depuis frontend/): node scripts/setup-git-hooks.js
 * Les hooks générés se placent dans frontend/ avant de s'exécuter (git les lance depuis la racine du dépôt).
 */

function createGitHooks() {
  // Le script est lancé depuis frontend/ : résoudre le vrai dossier .git du dépôt
  const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim()
  const hooksDir = path.join(gitDir, 'hooks')
  const preCommitHook = path.join(hooksDir, 'pre-commit')
  const prePushHook = path.join(hooksDir, 'pre-push')
  
  // Créer le répertoire hooks s'il n'existe pas
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true })
  }
  
  // Hook pre-commit
  const preCommitContent = `#!/bin/sh
# Hook pre-commit pour incrémenter automatiquement la version
cd "$(git rev-parse --show-toplevel)/frontend" && node scripts/pre-commit-hook.js
`
  
  fs.writeFileSync(preCommitHook, preCommitContent)
  fs.chmodSync(preCommitHook, '755')
  console.log('✅ Hook pre-commit configuré')
  
  // Hook pre-push (optionnel)
  const prePushContent = `#!/bin/sh
# Hook pre-push pour vérifier la version
echo "🚀 Pushing to remote repository..."
cd "$(git rev-parse --show-toplevel)/frontend" && echo "📦 Current version: $(node -p "require('./package.json').version")"
`
  
  fs.writeFileSync(prePushHook, prePushContent)
  fs.chmodSync(prePushHook, '755')
  console.log('✅ Hook pre-push configuré')
}

function createVersionFile() {
  const versionInfo = {
    version: "0.0.0",
    buildDate: new Date().toISOString(),
    buildNumber: Date.now()
  }
  
  // Créer le répertoire src s'il n'existe pas
  if (!fs.existsSync('src')) {
    fs.mkdirSync('src', { recursive: true })
  }
  
  fs.writeFileSync('public/version.json', JSON.stringify(versionInfo, null, 2) + '\n')
  console.log('✅ Fichier version.json initial créé')
}

function updatePackageScripts() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    
    // Ajouter des scripts de version
    packageJson.scripts = {
      ...packageJson.scripts,
      'version:patch': 'node scripts/version-bump.js patch',
      'version:minor': 'node scripts/version-bump.js minor',
      'version:major': 'node scripts/version-bump.js major',
      'version:current': 'node -p "require(\'./package.json\').version"',
      'setup:hooks': 'node scripts/setup-git-hooks.js'
    }
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n')
    console.log('✅ Scripts de version ajoutés au package.json')
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du package.json:', error.message)
  }
}

function main() {
  console.log('🔧 Configuration des hooks Git pour l\'incrémentation automatique de version...')
  
  // Vérifier si on est dans un dépôt Git
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' })
  } catch (error) {
    console.error('❌ Ce répertoire n\'est pas un dépôt Git. Initialisez d\'abord Git avec: git init')
    process.exit(1)
  }
  
  // Créer les hooks Git
  createGitHooks()
  
  // Créer le fichier de version initial
  createVersionFile()
  
  // Mettre à jour les scripts package.json
  updatePackageScripts()
  
  console.log('\n🎉 Configuration terminée !')
  console.log('\n📋 Commandes disponibles:')
  console.log('  npm run version:patch  - Incrémenter la version patch (0.0.1)')
  console.log('  npm run version:minor  - Incrémenter la version minor (0.1.0)')
  console.log('  npm run version:major  - Incrémenter la version major (1.0.0)')
  console.log('  npm run version:current - Afficher la version actuelle')
  console.log('\n🔄 L\'incrémentation automatique se fera à chaque commit sur la branche main/master')
}

// Exécuter le script
main()
