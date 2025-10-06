#!/usr/bin/env node

/**
 * Script de build optimisé pour Vercel
 * Évite les problèmes de dépendances natives comme sharp
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

console.log('🚀 Démarrage du build Vercel...')

try {
  // Vérifier si les icônes existent déjà
  const iconsDir = path.join(process.cwd(), 'public', 'icons')
  const hasIcons = fs.existsSync(iconsDir) && fs.readdirSync(iconsDir).length > 0
  
  if (!hasIcons) {
    console.log('📁 Copie des icônes par défaut...')
    
    // Créer le dossier icons s'il n'existe pas
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true })
    }
    
    // Copier les icônes de base depuis le dossier public
    const defaultIcons = [
      'icon-72x72.png',
      'icon-96x96.png', 
      'icon-128x128.png',
      'icon-144x144.png',
      'icon-152x152.png',
      'icon-192x192.png',
      'icon-384x384.png',
      'icon-512x512.png'
    ]
    
    for (const icon of defaultIcons) {
      const sourcePath = path.join(process.cwd(), 'public', icon)
      const destPath = path.join(iconsDir, icon)
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath)
        console.log(`✅ Copié: ${icon}`)
      }
    }
  } else {
    console.log('✅ Icônes déjà présentes, skip de la génération')
  }
  
  // Exécuter le build Vite
  console.log('🔨 Exécution du build Vite...')
  execSync('vite build --mode production', { 
    stdio: 'inherit',
    cwd: process.cwd()
  })
  
  console.log('✅ Build Vercel terminé avec succès!')
  
} catch (error) {
  console.error('❌ Erreur lors du build Vercel:', error.message)
  process.exit(1)
}
