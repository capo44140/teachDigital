#!/usr/bin/env node

/**
 * Script pour configurer les variables d'environnement Vercel
 * Usage: node scripts/setup-env.js
 */

import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnvironment() {
  console.log('🔧 Configuration des variables d\'environnement Vercel\n');

  try {
    // Vérifier si Vercel CLI est installé
    try {
      execSync('vercel --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('❌ Vercel CLI non trouvé. Installation...');
      execSync('npm install -g vercel', { stdio: 'inherit' });
    }

    // Demander les variables d'environnement
    console.log('📝 Veuillez fournir les informations suivantes :\n');

    const databaseUrl = await question('🗄️  DATABASE_URL (URL de votre base Neon) : ');
    const jwtSecret = await question('🔐 JWT_SECRET (clé secrète pour JWT) : ');
    const frontendUrl = await question('🌐 FRONTEND_URL (URL de votre frontend) [https://teachdigital.vercel.app] : ') || 'https://teachdigital.vercel.app';

    if (!databaseUrl || !jwtSecret) {
      console.log('❌ DATABASE_URL et JWT_SECRET sont requis');
      process.exit(1);
    }

    console.log('\n🚀 Configuration des variables d\'environnement...\n');

    // Configurer les variables d'environnement
    const commands = [
      `vercel env add DATABASE_URL production`,
      `vercel env add JWT_SECRET production`,
      `vercel env add FRONTEND_URL production`
    ];

    for (const cmd of commands) {
      try {
        console.log(`⚙️  Exécution: ${cmd}`);
        execSync(cmd, { 
          stdio: 'inherit',
          input: cmd.includes('DATABASE_URL') ? databaseUrl : 
                 cmd.includes('JWT_SECRET') ? jwtSecret : frontendUrl
        });
        console.log('✅ Variable configurée\n');
      } catch (error) {
        console.log(`⚠️  Erreur lors de la configuration: ${error.message}\n`);
      }
    }

    console.log('🎉 Configuration terminée !');
    console.log('\n📋 Prochaines étapes :');
    console.log('1. Déployer le backend : vercel --prod');
    console.log('2. Tester les endpoints');
    console.log('3. Adapter le frontend');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
  } finally {
    rl.close();
  }
}

setupEnvironment();
