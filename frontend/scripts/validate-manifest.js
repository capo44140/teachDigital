/**
 * Script de validation du manifest PWA
 * Vérifie que toutes les ressources référencées existent
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')
const publicDir = path.join(projectRoot, 'public')

async function validateManifest() {
  console.log('🔍 Validation du manifest PWA...')
  
  try {
    // Lire le manifest
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifestContent = fs.readFileSync(manifestPath, 'utf8')
    const manifest = JSON.parse(manifestContent)
    
    console.log(`✅ Manifest chargé: ${manifest.name} v${manifest.version}`)
    
    const errors = []
    const warnings = []
    
    // Vérifier les icônes
    console.log('\n📱 Vérification des icônes...')
    if (manifest.icons && Array.isArray(manifest.icons)) {
      for (const icon of manifest.icons) {
        const iconPath = path.join(publicDir, icon.src)
        if (fs.existsSync(iconPath)) {
          console.log(`✅ ${icon.src} (${icon.sizes})`)
        } else {
          errors.push(`Icône manquante: ${icon.src}`)
          console.log(`❌ ${icon.src} - FICHIER MANQUANT`)
        }
      }
    }
    
    // Vérifier les raccourcis
    console.log('\n🔗 Vérification des raccourcis...')
    if (manifest.shortcuts && Array.isArray(manifest.shortcuts)) {
      for (const shortcut of manifest.shortcuts) {
        console.log(`✅ Raccourci: ${shortcut.name} -> ${shortcut.url}`)
        
        // Vérifier les icônes des raccourcis
        if (shortcut.icons && Array.isArray(shortcut.icons)) {
          for (const icon of shortcut.icons) {
            const iconPath = path.join(publicDir, icon.src)
            if (fs.existsSync(iconPath)) {
              console.log(`  ✅ ${icon.src}`)
            } else {
              errors.push(`Icône de raccourci manquante: ${icon.src}`)
              console.log(`  ❌ ${icon.src} - FICHIER MANQUANT`)
            }
          }
        }
      }
    }
    
    // Vérifier les screenshots (si présents)
    if (manifest.screenshots && Array.isArray(manifest.screenshots)) {
      console.log('\n📸 Vérification des screenshots...')
      for (const screenshot of manifest.screenshots) {
        const screenshotPath = path.join(publicDir, screenshot.src)
        if (fs.existsSync(screenshotPath)) {
          console.log(`✅ ${screenshot.src}`)
        } else {
          warnings.push(`Screenshot manquant: ${screenshot.src}`)
          console.log(`⚠️ ${screenshot.src} - FICHIER MANQUANT`)
        }
      }
    }
    
    // Vérifier les propriétés requises
    console.log('\n📋 Vérification des propriétés requises...')
    const requiredProperties = ['name', 'short_name', 'start_url', 'display', 'icons']
    for (const prop of requiredProperties) {
      if (manifest[prop]) {
        console.log(`✅ ${prop}: ${typeof manifest[prop] === 'object' ? 'présent' : manifest[prop]}`)
      } else {
        errors.push(`Propriété requise manquante: ${prop}`)
        console.log(`❌ ${prop} - MANQUANT`)
      }
    }
    
    // Vérifier la validité des URLs
    console.log('\n🌐 Vérification des URLs...')
    if (manifest.start_url) {
      if (manifest.start_url.startsWith('/') || manifest.start_url.startsWith('http')) {
        console.log(`✅ start_url: ${manifest.start_url}`)
      } else {
        errors.push(`start_url invalide: ${manifest.start_url}`)
        console.log(`❌ start_url invalide: ${manifest.start_url}`)
      }
    }
    
    // Résumé
    console.log('\n📊 Résumé de la validation:')
    if (errors.length === 0 && warnings.length === 0) {
      console.log('🎉 Manifest PWA valide !')
    } else {
      if (errors.length > 0) {
        console.log(`❌ ${errors.length} erreur(s):`)
        errors.forEach(error => console.log(`  - ${error}`))
      }
      if (warnings.length > 0) {
        console.log(`⚠️ ${warnings.length} avertissement(s):`)
        warnings.forEach(warning => console.log(`  - ${warning}`))
      }
    }
    
    return { errors, warnings, manifest }
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation du manifest:', error.message)
    return { errors: [error.message], warnings: [], manifest: null }
  }
}

// Fonction pour créer des screenshots de base si nécessaire
async function createBasicScreenshots() {
  console.log('\n📸 Création de screenshots de base...')
  
  const screenshotsDir = path.join(publicDir, 'screenshots')
  
  // Créer le dossier screenshots s'il n'existe pas
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
    console.log('📁 Dossier screenshots créé')
  }
  
  // Note: Pour créer de vrais screenshots, il faudrait utiliser des outils comme Puppeteer
  // Pour l'instant, on crée juste des fichiers placeholder
  const placeholderContent = `<!-- Screenshot placeholder -->
<!-- Pour créer de vrais screenshots, utilisez:
     - Puppeteer pour des captures automatiques
     - Des outils de design comme Figma
     - Des captures d'écran manuelles
-->
`
  
  const placeholderFiles = [
    'desktop-1.png',
    'mobile-1.png'
  ]
  
  for (const filename of placeholderFiles) {
    const filePath = path.join(screenshotsDir, filename.replace('.png', '.md'))
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, placeholderContent)
      console.log(`📝 Placeholder créé: ${filename.replace('.png', '.md')}`)
    }
  }
}

// Exécuter la validation si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  validateManifest()
    .then(result => {
      if (result.errors.length > 0) {
        console.log('\n💡 Pour corriger les erreurs, exécutez:')
        console.log('   pnpm run validate-manifest')
        process.exit(1)
      }
    })
    .catch(console.error)
}

export { validateManifest, createBasicScreenshots }
