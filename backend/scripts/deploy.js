#!/usr/bin/env node

/**
 * Script de déploiement automatisé pour Vercel
 * Usage: node scripts/deploy.js [preview|production]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const mode = process.argv[2] || 'preview';

async function deploy() {
  console.log(`🚀 Déploiement en mode: ${mode}\n`);

  try {
    // Vérifier que nous sommes dans le bon répertoire
    if (!fs.existsSync('vercel.json')) {
      console.log('❌ Fichier vercel.json non trouvé. Assurez-vous d\'être dans le répertoire backend/');
      process.exit(1);
    }

    // Vérifier que les dépendances sont installées
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Installation des dépendances...');
      execSync('pnpm install', { stdio: 'inherit' });
    }

    // Vérifier la configuration
    console.log('🔍 Vérification de la configuration...');
    
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    console.log('✅ Configuration Vercel valide');

    // Déploiement
    console.log(`\n🚀 Déploiement en cours...`);
    
    const deployCommand = mode === 'production' ? 'vercel --prod' : 'vercel';
    const result = execSync(deployCommand, { 
      stdio: 'inherit',
      encoding: 'utf8'
    });

    console.log('\n✅ Déploiement terminé avec succès !');
    
    if (mode === 'preview') {
      console.log('\n📋 Prochaines étapes :');
      console.log('1. Tester les endpoints en preview');
      console.log('2. Configurer les variables d\'environnement si nécessaire');
      console.log('3. Déployer en production : node scripts/deploy.js production');
    } else {
      console.log('\n🎉 Backend déployé en production !');
      console.log('\n📋 Prochaines étapes :');
      console.log('1. Tester les endpoints de production');
      console.log('2. Adapter le frontend pour utiliser les nouvelles APIs');
      console.log('3. Mettre à jour les variables d\'environnement du frontend');
    }

  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error.message);
    process.exit(1);
  }
}

deploy();
