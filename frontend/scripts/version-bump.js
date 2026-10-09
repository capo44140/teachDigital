#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

/**
 * Script d'incrémentation automatique de version
 * Usage: node scripts/version-bump.js [patch|minor|major]
 */

const VERSION_TYPES = {
  patch: 'patch',  // 1.0.0 -> 1.0.1
  minor: 'minor',  // 1.0.0 -> 1.1.0
  major: 'major'   // 1.0.0 -> 2.0.0
}

function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    return packageJson.version
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du package.json:', error.message)
    process.exit(1)
  }
}

function incrementVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number)
  
  switch (type) {
    case 'major':
      parts[0]++
      parts[1] = 0
      parts[2] = 0
      break
    case 'minor':
      parts[1]++
      parts[2] = 0
      break
    case 'patch':
    default:
      parts[2]++
      break
  }
  
  return parts.join('.')
}

function updatePackageJson(newVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    packageJson.version = newVersion
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n')
    console.log(`✅ Version mise à jour dans package.json: ${newVersion}`)
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du package.json:', error.message)
    process.exit(1)
  }
}

function updateManifestJson(newVersion) {
  const manifestPath = 'public/manifest.json'
  try {
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      manifest.version = newVersion
      manifest.version_name = newVersion
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`✅ Version mise à jour dans manifest.json: ${newVersion}`)
    }
  } catch (error) {
    console.warn('⚠️ Impossible de mettre à jour manifest.json:', error.message)
  }
}

function createVersionFile(newVersion) {
  const versionInfo = {
    version: newVersion,
    buildDate: new Date().toISOString(),
    buildNumber: Date.now()
  }
  
  try {
    fs.writeFileSync('public/version.json', JSON.stringify(versionInfo, null, 2) + '\n')
    console.log(`✅ Fichier version.json créé: ${newVersion}`)
  } catch (error) {
    console.warn('⚠️ Impossible de créer version.json:', error.message)
  }
}

function commitVersionChange(newVersion) {
  try {
    // Ajouter les fichiers modifiés
    execSync('git add package.json public/manifest.json public/version.json', { stdio: 'inherit' })
    
    // Créer un commit pour la version
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' })
    
    console.log(`✅ Commit créé pour la version ${newVersion}`)
  } catch (error) {
    console.warn('⚠️ Impossible de créer le commit automatique:', error.message)
    console.log('💡 Vous pouvez créer le commit manuellement avec:')
    console.log(`   git add package.json public/manifest.json public/version.json`)
    console.log(`   git commit -m "chore: bump version to ${newVersion}"`)
  }
}

function main() {
  const versionType = process.argv[2] || 'patch'
  
  if (!VERSION_TYPES[versionType]) {
    console.error(`❌ Type de version invalide: ${versionType}`)
    console.log('Usage: node scripts/version-bump.js [patch|minor|major]')
    process.exit(1)
  }
  
  console.log(`🚀 Incrémentation de version (${versionType})...`)
  
  const currentVersion = getCurrentVersion()
  console.log(`📦 Version actuelle: ${currentVersion}`)
  
  const newVersion = incrementVersion(currentVersion, versionType)
  console.log(`📦 Nouvelle version: ${newVersion}`)
  
  // Mettre à jour les fichiers
  updatePackageJson(newVersion)
  updateManifestJson(newVersion)
  createVersionFile(newVersion)
  
  // Créer un commit automatique
  commitVersionChange(newVersion)
  
  console.log(`\n🎉 Version incrémentée avec succès: ${currentVersion} -> ${newVersion}`)
  console.log('💡 Pour pousser les changements: git push')
}

// Exécuter le script
main()
