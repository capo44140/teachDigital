#!/usr/bin/env node

/**
 * Script pour vérifier la configuration Vercel
 * Vérifie les variables d'environnement et la configuration
 */

import fs from 'fs'
import path from 'path'

console.log('🔍 Vérification de la configuration Vercel...')

// Vérifier les variables d'environnement critiques
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET'
]

console.log('\n📋 Variables d\'environnement:')
let missingVars = []

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar]
  if (value) {
    console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`)
  } else {
    console.log(`❌ ${envVar}: NON DÉFINIE`)
    missingVars.push(envVar)
  }
}

if (missingVars.length > 0) {
  console.log(`\n⚠️  Variables manquantes: ${missingVars.join(', ')}`)
  console.log('💡 Assurez-vous que ces variables sont définies dans Vercel')
} else {
  console.log('\n✅ Toutes les variables d\'environnement sont présentes')
}

// Vérifier la structure des fichiers
console.log('\n📁 Vérification de la structure des fichiers:')

const requiredFiles = [
  'vercel.json',
  'package.json',
  'backend/api/index.js',
  'backend/lib/database.js',
  'public/icon.svg',
  'public/manifest.json'
]

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - MANQUANT`)
  }
}

// Vérifier le script de build
console.log('\n🔨 Vérification du script de build:')
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  if (packageJson.scripts['build:vercel']) {
    console.log('✅ Script build:vercel trouvé')
  } else {
    console.log('❌ Script build:vercel manquant')
  }
} catch (error) {
  console.log('❌ Erreur lors de la lecture du package.json:', error.message)
}

console.log('\n🎯 Configuration Vercel vérifiée!')
