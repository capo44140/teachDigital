#!/usr/bin/env node

import fs from 'fs'

/**
 * Script de test pour vérifier l'affichage de la version
 * Usage: node scripts/test-version-display.js
 */

function testVersionFiles() {
  console.log('🔍 Test des fichiers de version...')
  
  // Vérifier package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    console.log(`✅ package.json - Version: ${packageJson.version}`)
  } catch (error) {
    console.error('❌ Erreur package.json:', error.message)
  }
  
  // Vérifier src/version.json
  try {
    const versionJson = JSON.parse(fs.readFileSync('src/version.json', 'utf8'))
    console.log(`✅ src/version.json - Version: ${versionJson.version}`)
    console.log(`   Build Date: ${versionJson.buildDate}`)
    console.log(`   Build Number: ${versionJson.buildNumber}`)
  } catch (error) {
    console.error('❌ Erreur src/version.json:', error.message)
  }
  
  // Vérifier public/manifest.json
  try {
    const manifestJson = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'))
    console.log(`✅ public/manifest.json - Version: ${manifestJson.version}`)
  } catch (error) {
    console.error('❌ Erreur public/manifest.json:', error.message)
  }
}

function testVersionConsistency() {
  console.log('\n🔍 Test de cohérence des versions...')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const versionJson = JSON.parse(fs.readFileSync('src/version.json', 'utf8'))
    const manifestJson = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'))
    
    const versions = {
      package: packageJson.version,
      version: versionJson.version,
      manifest: manifestJson.version
    }
    
    const uniqueVersions = [...new Set(Object.values(versions))]
    
    if (uniqueVersions.length === 1) {
      console.log(`✅ Toutes les versions sont cohérentes: ${uniqueVersions[0]}`)
    } else {
      console.log('❌ Versions incohérentes:')
      Object.entries(versions).forEach(([file, version]) => {
        console.log(`   ${file}: ${version}`)
      })
    }
  } catch (error) {
    console.error('❌ Erreur lors du test de cohérence:', error.message)
  }
}

function testVersionInfoComponent() {
  console.log('\n🔍 Test du composant VersionInfo...')
  
  const versionInfoPath = 'src/components/VersionInfo.vue'
  
  if (fs.existsSync(versionInfoPath)) {
    console.log('✅ Composant VersionInfo.vue existe')
    
    const content = fs.readFileSync(versionInfoPath, 'utf8')
    
    // Vérifier les éléments clés du composant
    const checks = [
      { name: 'Template avec version-badge', pattern: /version-badge/ },
      { name: 'Script avec loadVersionInfo', pattern: /loadVersionInfo/ },
      { name: 'Style avec version-info', pattern: /\.version-info/ },
      { name: 'Props position', pattern: /position:/ },
      { name: 'Data appVersion', pattern: /appVersion:/ }
    ]
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`✅ ${check.name}`)
      } else {
        console.log(`❌ ${check.name} - Non trouvé`)
      }
    })
  } else {
    console.log('❌ Composant VersionInfo.vue non trouvé')
  }
}

function testIntegration() {
  console.log('\n🔍 Test d\'intégration dans les composants parent...')
  
  const parentComponents = [
    'src/components/Dashboard.vue',
    'src/components/ParentProgressTracking.vue',
    'src/components/ParentQuizManagement.vue'
  ]
  
  parentComponents.forEach(component => {
    if (fs.existsSync(component)) {
      const content = fs.readFileSync(component, 'utf8')
      
      if (content.includes('VersionInfo')) {
        console.log(`✅ ${component} - VersionInfo intégré`)
      } else {
        console.log(`❌ ${component} - VersionInfo non intégré`)
      }
    } else {
      console.log(`❌ ${component} - Fichier non trouvé`)
    }
  })
}

function main() {
  console.log('🚀 Test de l\'affichage de la version\n')
  
  testVersionFiles()
  testVersionConsistency()
  testVersionInfoComponent()
  testIntegration()
  
  console.log('\n🎉 Test terminé !')
  console.log('\n💡 Pour tester visuellement:')
  console.log('   1. Lancez l\'application: npm run dev')
  console.log('   2. Naviguez vers une page parent')
  console.log('   3. Vérifiez l\'affichage de la version en bas à droite')
  console.log('   4. Cliquez sur le badge de version pour voir les détails')
}

// Exécuter le script
main()
