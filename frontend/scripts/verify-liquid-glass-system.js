#!/usr/bin/env node

/**
 * Script de vérification du système Liquid Glass centralisé
 * Vérifie que tous les composants et styles sont correctement configurés
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔍 Vérification du système Liquid Glass centralisé...\n')

// Vérification des fichiers
const filesToCheck = [
  'src/styles/liquid-glass.css',
  'src/components/ui/GlassCard.vue',
  'src/components/ui/GlassButton.vue',
  'src/components/ui/GlassToggle.vue',
  'src/components/ui/GlassProgress.vue',
  'src/components/ui/GlassBadge.vue',
  'src/components/ui/GlassLayout.vue',
  'src/components/ui/index.js',
  'src/style.css',
  'doc/LIQUID-GLASS-CENTRALIZED-SYSTEM.md'
]

let allFilesExist = true

console.log('📁 Vérification des fichiers :')
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file)
  const exists = fs.existsSync(filePath)
  console.log(`  ${exists ? '✅' : '❌'} ${file}`)
  if (!exists) allFilesExist = false
})

console.log('')

// Vérification du contenu du fichier CSS principal
console.log('🎨 Vérification du système CSS :')
try {
  const cssPath = path.join(__dirname, '..', 'src/styles/liquid-glass.css')
  const cssContent = fs.readFileSync(cssPath, 'utf8')
  
  const requiredVariables = [
    '--lg-primary-purple',
    '--lg-secondary-purple',
    '--lg-glass-light',
    '--lg-glass-medium',
    '--lg-glass-heavy',
    '--lg-gradient-primary',
    '--lg-gradient-quiz',
    '--lg-gradient-learning'
  ]
  
  const requiredClasses = [
    '.lg-glass-base',
    '.lg-glass-card',
    '.lg-glass-button',
    '.lg-glass-toggle',
    '.lg-glass-progress',
    '.lg-glass-badge',
    '.lg-glass-layout'
  ]
  
  const requiredAnimations = [
    '@keyframes lg-blob-animation',
    '@keyframes lg-fade-in-up'
  ]
  
  console.log('  Variables CSS :')
  requiredVariables.forEach(variable => {
    const exists = cssContent.includes(variable)
    console.log(`    ${exists ? '✅' : '❌'} ${variable}`)
  })
  
  console.log('  Classes CSS :')
  requiredClasses.forEach(className => {
    const exists = cssContent.includes(className)
    console.log(`    ${exists ? '✅' : '❌'} ${className}`)
  })
  
  console.log('  Animations :')
  requiredAnimations.forEach(animation => {
    const exists = cssContent.includes(animation)
    console.log(`    ${exists ? '✅' : '❌'} ${animation}`)
  })
  
} catch (error) {
  console.log('  ❌ Erreur lors de la lecture du fichier CSS')
}

console.log('')

// Vérification de l'import dans style.css
console.log('📦 Vérification de l\'import :')
try {
  const stylePath = path.join(__dirname, '..', 'src/style.css')
  const styleContent = fs.readFileSync(stylePath, 'utf8')
  
  const hasImport = styleContent.includes('@import "./styles/liquid-glass.css"')
  console.log(`  ${hasImport ? '✅' : '❌'} Import liquid-glass.css dans style.css`)
  
} catch (error) {
  console.log('  ❌ Erreur lors de la lecture de style.css')
}

console.log('')

// Vérification des composants Vue
console.log('🧩 Vérification des composants Vue :')
const componentFiles = [
  'src/components/ui/GlassCard.vue',
  'src/components/ui/GlassButton.vue',
  'src/components/ui/GlassToggle.vue',
  'src/components/ui/GlassProgress.vue',
  'src/components/ui/GlassBadge.vue',
  'src/components/ui/GlassLayout.vue'
]

componentFiles.forEach(componentFile => {
  try {
    const componentPath = path.join(__dirname, '..', componentFile)
    const componentContent = fs.readFileSync(componentPath, 'utf8')
    
    const hasTemplate = componentContent.includes('<template>')
    const hasScript = componentContent.includes('<script')
    const hasStyle = componentContent.includes('<style')
    
    const componentName = path.basename(componentFile, '.vue')
    console.log(`  ${componentName} :`)
    console.log(`    ${hasTemplate ? '✅' : '❌'} Template`)
    console.log(`    ${hasScript ? '✅' : '❌'} Script`)
    console.log(`    ${hasStyle ? '✅' : '❌'} Style`)
    
  } catch (error) {
    console.log(`  ❌ Erreur lors de la lecture de ${componentFile}`)
  }
})

console.log('')

// Vérification du fichier d'index
console.log('📋 Vérification des exports :')
try {
  const indexPath = path.join(__dirname, '..', 'src/components/ui/index.js')
  const indexContent = fs.readFileSync(indexPath, 'utf8')
  
  const requiredExports = [
    'GlassCard',
    'GlassButton',
    'GlassToggle',
    'GlassProgress',
    'GlassBadge',
    'GlassLayout'
  ]
  
  requiredExports.forEach(exportName => {
    const exists = indexContent.includes(exportName)
    console.log(`  ${exists ? '✅' : '❌'} Export ${exportName}`)
  })
  
} catch (error) {
  console.log('  ❌ Erreur lors de la lecture du fichier index.js')
}

console.log('')

// Résumé
console.log('📊 Résumé :')
if (allFilesExist) {
  console.log('✅ Tous les fichiers du système Liquid Glass sont présents')
  console.log('✅ Le système est prêt à être utilisé')
  console.log('')
  console.log('🚀 Prochaines étapes :')
  console.log('  1. Importer les composants dans vos pages')
  console.log('  2. Utiliser les classes lg-* pour le styling')
  console.log('  3. Migrer progressivement les composants existants')
  console.log('  4. Tester la cohérence visuelle')
} else {
  console.log('❌ Certains fichiers sont manquants')
  console.log('❌ Le système n\'est pas complet')
}

console.log('')
console.log('📚 Documentation disponible dans : doc/LIQUID-GLASS-CENTRALIZED-SYSTEM.md')
