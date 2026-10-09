#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'

/**
 * Script pour analyser et mettre à jour les dépendances
 * Usage: node scripts/update-dependencies.js [--check|--update|--major]
 */

const UPDATE_MODES = {
  check: 'check',      // Vérifier seulement
  minor: 'minor',      // Mises à jour mineures et patch
  major: 'major'       // Mises à jour majeures
}

function getCurrentVersions() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    return {
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {}
    }
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du package.json:', error.message)
    process.exit(1)
  }
}

function checkOutdatedPackages() {
  console.log('🔍 Vérification des packages obsolètes...')
  
  try {
    const output = execSync('npm outdated --json', { encoding: 'utf8' })
    const outdated = JSON.parse(output)
    
    if (Object.keys(outdated).length === 0) {
      console.log('✅ Toutes les dépendances sont à jour !')
      return {}
    }
    
    console.log(`📦 ${Object.keys(outdated).length} package(s) obsolète(s) trouvé(s):`)
    
    Object.entries(outdated).forEach(([packageName, info]) => {
      console.log(`\n📋 ${packageName}:`)
      console.log(`   Version actuelle: ${info.current}`)
      console.log(`   Version voulue:   ${info.wanted}`)
      console.log(`   Version latest:   ${info.latest}`)
      console.log(`   Type: ${info.wanted !== info.latest ? 'Mise à jour majeure disponible' : 'Mise à jour mineure'}`)
    })
    
    return outdated
  } catch (error) {
    console.log('ℹ️ Aucun package obsolète trouvé ou erreur de vérification')
    return {}
  }
}

function analyzeDependencies() {
  console.log('📊 Analyse des dépendances...')
  
  const { dependencies, devDependencies } = getCurrentVersions()
  const allDeps = { ...dependencies, ...devDependencies }
  
  console.log(`\n📦 Total des dépendances: ${Object.keys(allDeps).length}`)
  console.log(`   Dependencies: ${Object.keys(dependencies).length}`)
  console.log(`   DevDependencies: ${Object.keys(devDependencies).length}`)
  
  // Analyser les versions
  const versionAnalysis = {
    exact: 0,
    caret: 0,
    tilde: 0,
    range: 0
  }
  
  Object.values(allDeps).forEach(version => {
    if (version.startsWith('^')) versionAnalysis.caret++
    else if (version.startsWith('~')) versionAnalysis.tilde++
    else if (version.includes('-') || version.includes(' ')) versionAnalysis.range++
    else versionAnalysis.exact++
  })
  
  console.log('\n📈 Analyse des contraintes de version:')
  console.log(`   Exact (1.0.0): ${versionAnalysis.exact}`)
  console.log(`   Caret (^1.0.0): ${versionAnalysis.caret}`)
  console.log(`   Tilde (~1.0.0): ${versionAnalysis.tilde}`)
  console.log(`   Range (1.0.0-2.0.0): ${versionAnalysis.range}`)
  
  return { dependencies, devDependencies, allDeps }
}

function getUpdateRecommendations(outdated) {
  console.log('\n💡 Recommandations de mise à jour:')
  
  const recommendations = {
    safe: [],
    major: [],
    critical: []
  }
  
  Object.entries(outdated).forEach(([packageName, info]) => {
    const isMajorUpdate = info.wanted !== info.latest
    const isVulnerable = checkVulnerabilities(packageName)
    
    if (isVulnerable) {
      recommendations.critical.push({
        package: packageName,
        current: info.current,
        latest: info.latest,
        reason: 'Vulnérabilités de sécurité détectées'
      })
    } else if (isMajorUpdate) {
      recommendations.major.push({
        package: packageName,
        current: info.current,
        latest: info.latest,
        reason: 'Mise à jour majeure disponible'
      })
    } else {
      recommendations.safe.push({
        package: packageName,
        current: info.current,
        latest: info.latest,
        reason: 'Mise à jour mineure sûre'
      })
    }
  })
  
  // Afficher les recommandations
  if (recommendations.critical.length > 0) {
    console.log('\n🚨 Mises à jour CRITIQUES (sécurité):')
    recommendations.critical.forEach(rec => {
      console.log(`   ${rec.package}: ${rec.current} → ${rec.latest} (${rec.reason})`)
    })
  }
  
  if (recommendations.safe.length > 0) {
    console.log('\n✅ Mises à jour SÛRES (mineures):')
    recommendations.safe.forEach(rec => {
      console.log(`   ${rec.package}: ${rec.current} → ${rec.latest}`)
    })
  }
  
  if (recommendations.major.length > 0) {
    console.log('\n⚠️ Mises à jour MAJEURES (test recommandé):')
    recommendations.major.forEach(rec => {
      console.log(`   ${rec.package}: ${rec.current} → ${rec.latest}`)
    })
  }
  
  return recommendations
}

function checkVulnerabilities(packageName) {
  // Liste des packages connus pour avoir des vulnérabilités
  const vulnerablePackages = [
    'bcryptjs', // Souvent des vulnérabilités mineures
    'dotenv'    // Parfois des vulnérabilités
  ]
  
  return vulnerablePackages.includes(packageName)
}

function updateDependencies(mode = 'minor') {
  console.log(`\n🔄 Mise à jour des dépendances (mode: ${mode})...`)
  
  try {
    if (mode === 'minor') {
      console.log('📦 Mise à jour des versions mineures et patch...')
      execSync('npm update', { stdio: 'inherit' })
    } else if (mode === 'major') {
      console.log('📦 Mise à jour des versions majeures...')
      execSync('npm install --save-dev npm-check-updates', { stdio: 'inherit' })
      execSync('npx npm-check-updates -u', { stdio: 'inherit' })
      execSync('npm install', { stdio: 'inherit' })
    }
    
    console.log('✅ Mise à jour terminée !')
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error.message)
    process.exit(1)
  }
}

function createBackup() {
  console.log('💾 Création d\'une sauvegarde...')
  
  try {
    const packageJson = fs.readFileSync('package.json', 'utf8')
    const backupName = `package.json.backup.${Date.now()}`
    fs.writeFileSync(backupName, packageJson)
    console.log(`✅ Sauvegarde créée: ${backupName}`)
    return backupName
  } catch (error) {
    console.warn('⚠️ Impossible de créer la sauvegarde:', error.message)
    return null
  }
}

function main() {
  const mode = process.argv[2] || 'check'
  
  if (!Object.values(UPDATE_MODES).includes(mode)) {
    console.error(`❌ Mode invalide: ${mode}`)
    console.log('Usage: node scripts/update-dependencies.js [--check|--minor|--major]')
    process.exit(1)
  }
  
  console.log('🚀 Analyse des dépendances TeachDigital\n')
  
  // Analyser les dépendances actuelles
  analyzeDependencies()
  
  // Vérifier les packages obsolètes
  const outdated = checkOutdatedPackages()
  
  if (Object.keys(outdated).length === 0) {
    console.log('\n🎉 Toutes les dépendances sont à jour !')
    return
  }
  
  // Obtenir les recommandations
  const recommendations = getUpdateRecommendations(outdated)
  
  if (mode === 'check') {
    console.log('\n💡 Pour mettre à jour:')
    console.log('   npm run update:deps:minor  - Mises à jour mineures')
    console.log('   npm run update:deps:major  - Mises à jour majeures')
    return
  }
  
  // Créer une sauvegarde
  const backup = createBackup()
  
  // Mettre à jour selon le mode
  updateDependencies(mode)
  
  // Vérifier après mise à jour
  console.log('\n🔍 Vérification post-mise à jour...')
  checkOutdatedPackages()
  
  console.log('\n🎉 Mise à jour terminée !')
  if (backup) {
    console.log(`💾 Sauvegarde disponible: ${backup}`)
  }
}

// Exécuter le script
main()
