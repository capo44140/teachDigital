#!/usr/bin/env node

/**
 * Script pour configurer les variables d'environnement Vercel
 */

import { execSync } from 'child_process';
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
      'JWT_SECRET': 'teachdigital-super-secret-jwt-key-2024-change-in-production',
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
        const command = `echo "${value}" | vercel env add ${key} production`;
        execSync(command, { 
          stdio: 'inherit',
          shell: true
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
