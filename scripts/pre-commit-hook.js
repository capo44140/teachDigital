#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'

/**
 * Hook Git pre-commit pour incrémenter automatiquement la version
 * Ce script s'exécute avant chaque commit
 */

function checkIfVersionFilesChanged() {
  try {
    // Vérifier si des fichiers de version ont été modifiés
    const result = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    const changedFiles = result.trim().split('\n').filter(Boolean)
    
    const versionFiles = ['package.json', 'public/manifest.json', 'public/version.json']
    const hasVersionChanges = versionFiles.some(file => changedFiles.includes(file))
    
    return hasVersionChanges
  } catch (error) {
    console.warn('⚠️ Impossible de vérifier les fichiers modifiés:', error.message)
    return false
  }
}

function shouldAutoIncrementVersion() {
  // Vérifier si on est sur la branche principale
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim()
    return branch === 'main' || branch === 'master'
  } catch (error) {
    console.warn('⚠️ Impossible de vérifier la branche actuelle:', error.message)
    return false
  }
}

function autoIncrementVersion() {
  try {
    console.log('🔄 Incrémentation automatique de la version...')
    execSync('node scripts/version-bump.js patch', { stdio: 'inherit' })
    
    // Ajouter les fichiers modifiés au staging area
    execSync('git add package.json public/manifest.json public/version.json', { stdio: 'inherit' })
    
    console.log('✅ Version incrémentée automatiquement')
  } catch (error) {
    console.error('❌ Erreur lors de l\'incrémentation automatique:', error.message)
    process.exit(1)
  }
}

function main() {
  console.log('🔍 Vérification du hook pre-commit...')
  
  // Vérifier si des fichiers de version sont déjà modifiés
  if (checkIfVersionFilesChanged()) {
    console.log('ℹ️ Des fichiers de version sont déjà modifiés, pas d\'incrémentation automatique')
    return
  }
  
  // Vérifier si on doit incrémenter automatiquement
  if (shouldAutoIncrementVersion()) {
    autoIncrementVersion()
  } else {
    console.log('ℹ️ Pas d\'incrémentation automatique sur cette branche')
  }
  
  console.log('✅ Hook pre-commit terminé avec succès')
}

// Exécuter le hook
main()
