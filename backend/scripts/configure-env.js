#!/usr/bin/env node

/**
 * Script pour configurer les variables d'environnement Vercel
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';

// Lire les variables d'environnement depuis le fichier .env du projet principal
function getEnvVars() {
  const envPath = '../.env';
  const envExamplePath = '../env.example';
  
  let envVars = {};
  
  // Essayer de lire le fichier .env
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  
  // Lire depuis env.example si .env n'existe pas
  if (fs.existsSync(envExamplePath)) {
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!envVars[key.trim()] && !value.includes('xxx')) {
          envVars[key.trim()] = value;
        }
      }
    });
  }
  
  return envVars;
}

async function configureEnvironment() {
  console.log('🔧 Configuration des variables d\'environnement Vercel\n');

  try {
    const envVars = getEnvVars();
    
    // Variables requises
    const requiredVars = {
      'DATABASE_URL': envVars.DATABASE_URL || envVars.VITE_DATABASE_URL,
      // Jamais de valeur littérale : secret fourni (.env / variable d'environnement)
      // ou généré aléatoirement (32 octets = 64 caractères hex).
      'JWT_SECRET': envVars.JWT_SECRET || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
      'FRONTEND_URL': 'https://teachdigital.vercel.app'
    };

    console.log('📝 Configuration des variables :\n');

    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
        console.log(`❌ Variable ${key} manquante`);
        continue;
      }

      try {
        console.log(`⚙️  Configuration de ${key}...`);
        
        // Utiliser echo pour passer la valeur à vercel env add
        // Valeur passée sur stdin (pas dans la ligne de commande / l'historique du shell)
        execSync(`vercel env add ${key} production`, {
          input: value,
          stdio: ['pipe', 'inherit', 'inherit']
        });
        
        console.log(`✅ ${key} configurée\n`);
      } catch (error) {
        console.log(`⚠️  Erreur pour ${key}: ${error.message}\n`);
      }
    }

    console.log('🎉 Configuration terminée !');
    console.log('\n📋 Prochaines étapes :');
    console.log('1. Redéployer : vercel --prod');
    console.log('2. Tester les endpoints');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
  }
}

configureEnvironment();
