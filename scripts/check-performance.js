#!/usr/bin/env node

/**
 * Script de vérification rapide des optimisations de performance
 * Usage: npm run check:performance
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

console.log('🔍 Vérification des optimisations de performance...\n')

let allChecks = true

// Vérification 1: Skeleton component existe
console.log('1️⃣ Vérification du composant Skeleton...')
const skeletonPath = path.join(rootDir, 'src/components/ProfileSkeleton.vue')
if (fs.existsSync(skeletonPath)) {
  console.log('   ✅ ProfileSkeleton.vue existe')
} else {
  console.log('   ❌ ProfileSkeleton.vue manquant')
  allChecks = false
}

// Vérification 2: main.js utilise le chargement asynchrone
console.log('\n2️⃣ Vérification du chargement asynchrone...')
const mainPath = path.join(rootDir, 'src/main.js')
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8')
  if (mainContent.includes('scheduleIdleTask') && mainContent.includes('initializeServicesAsync')) {
    console.log('   ✅ Chargement asynchrone implémenté')
  } else {
    console.log('   ❌ Chargement asynchrone manquant')
    allChecks = false
  }
} else {
  console.log('   ❌ main.js manquant')
  allChecks = false
}

// Vérification 3: ProfileSelector utilise ProfileSkeleton
console.log('\n3️⃣ Vérification de l\'intégration du Skeleton...')
const profileSelectorPath = path.join(rootDir, 'src/components/ProfileSelector.vue')
if (fs.existsSync(profileSelectorPath)) {
  const selectorContent = fs.readFileSync(profileSelectorPath, 'utf8')
  if (selectorContent.includes('ProfileSkeleton') && selectorContent.includes('import ProfileSkeleton')) {
    console.log('   ✅ ProfileSkeleton intégré dans ProfileSelector')
  } else {
    console.log('   ❌ ProfileSkeleton non intégré')
    allChecks = false
  }
} else {
  console.log('   ❌ ProfileSelector.vue manquant')
  allChecks = false
}

// Vérification 4: Code splitting dans le router
console.log('\n4️⃣ Vérification du code splitting...')
const routerPath = path.join(rootDir, 'src/router/index.js')
if (fs.existsSync(routerPath)) {
  const routerContent = fs.readFileSync(routerPath, 'utf8')
  if (routerContent.includes('import(') && routerContent.includes('webpackChunkName')) {
    console.log('   ✅ Code splitting configuré')
  } else {
    console.log('   ⚠️  Code splitting basique (peut être amélioré)')
  }
} else {
  console.log('   ❌ router/index.js manquant')
  allChecks = false
}

// Vérification 5: Badges accessibilité corrigés
console.log('\n5️⃣ Vérification des badges accessibilité...')
const componentsToCheck = [
  'src/components/ProfileSelector.vue',
  'src/components/ProfileManagement.vue',
  'src/components/EditProfilePage.vue'
]

let badgesOk = true
for (const comp of componentsToCheck) {
  const compPath = path.join(rootDir, comp)
  if (fs.existsSync(compPath)) {
    const content = fs.readFileSync(compPath, 'utf8')
    if (content.includes('bg-red-700') && content.includes('bg-orange-700')) {
      // OK - badges corrigés
    } else if (content.includes('bg-red-500') || content.includes('bg-orange-500')) {
      console.log(`   ⚠️  ${path.basename(comp)} utilise encore les anciennes couleurs`)
      badgesOk = false
    }
  }
}

if (badgesOk) {
  console.log('   ✅ Badges accessibilité corrigés (bg-red-700, bg-orange-700)')
} else {
  console.log('   ❌ Certains badges utilisent encore les anciennes couleurs')
  allChecks = false
}

// Vérification 6: Documentation créée
console.log('\n6️⃣ Vérification de la documentation...')
const docs = [
  'OPTIMIZATIONS-README.md',
  'PERFORMANCE-OPTIMIZATIONS-2024.md',
  'QUICK-PERFORMANCE-CHECK.md',
  'VERCEL-PERFORMANCE-OPTIMIZATION.md'
]

let docsOk = true
for (const doc of docs) {
  const docPath = path.join(rootDir, doc)
  if (fs.existsSync(docPath)) {
    console.log(`   ✅ ${doc}`)
  } else {
    console.log(`   ❌ ${doc} manquant`)
    docsOk = false
  }
}

if (!docsOk) {
  allChecks = false
}

// Vérification 7: Taille du bundle (si dist existe)
console.log('\n7️⃣ Vérification de la taille du bundle...')
const distPath = path.join(rootDir, 'dist')
if (fs.existsSync(distPath)) {
  const assetsPath = path.join(distPath, 'assets')
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath)
    const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('chunk'))
    
    if (jsFiles.length > 0) {
      let totalSize = 0
      jsFiles.forEach(file => {
        const filePath = path.join(assetsPath, file)
        const stats = fs.statSync(filePath)
        totalSize += stats.size
      })
      
      const totalKB = (totalSize / 1024).toFixed(2)
      console.log(`   📦 Taille totale des JS principaux: ${totalKB} KB`)
      
      if (totalSize < 150 * 1024) {
        console.log('   ✅ Bundle size optimal (< 150 KB)')
      } else if (totalSize < 200 * 1024) {
        console.log('   ⚠️  Bundle size acceptable (< 200 KB)')
      } else {
        console.log('   ❌ Bundle size trop élevé (> 200 KB)')
        allChecks = false
      }
    }
  }
} else {
  console.log('   ℹ️  Pas de build disponible (exécuter npm run build)')
}

// Résultat final
console.log('\n' + '='.repeat(50))
if (allChecks) {
  console.log('✅ Toutes les vérifications sont passées!')
  console.log('\n🚀 Prochaines étapes:')
  console.log('   1. npm run build')
  console.log('   2. npm run preview')
  console.log('   3. Tester avec Lighthouse (F12 > Lighthouse)')
  console.log('   4. Vérifier le score > 85/100')
  process.exit(0)
} else {
  console.log('❌ Certaines vérifications ont échoué')
  console.log('\n📚 Consulter la documentation:')
  console.log('   - OPTIMIZATIONS-README.md')
  console.log('   - QUICK-PERFORMANCE-CHECK.md')
  process.exit(1)
}

