#!/usr/bin/env node

/**
 * Script de vérification de l'ajout du header dans BadgeManager.vue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏆 Vérification de l\'ajout du header dans BadgeManager.vue');
console.log('=' .repeat(60));

const filePath = path.join(__dirname, '..', 'src', 'components', 'BadgeManager.vue');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Vérifications du header
  const headerChecks = [
    {
      name: 'Header présent',
      test: () => content.includes('<header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">')
    },
    {
      name: 'Bouton retour présent',
      test: () => content.includes('@click="goBack"') && content.includes('M15 19l-7-7 7-7')
    },
    {
      name: 'Titre du header',
      test: () => content.includes('Gestionnaire de Badges') && content.includes('Découvre et gère tes badges')
    },
    {
      name: 'Avatar profil',
      test: () => content.includes('bg-gradient-to-r from-purple-400 to-pink-400') && content.includes('🏆')
    },
    {
      name: 'Méthode goBack',
      test: () => content.includes('goBack()') && content.includes('user-dashboard')
    },
    {
      name: 'Styles header',
      test: () => content.includes('header {') && content.includes('header button:hover')
    },
    {
      name: 'Design Liquid Glass header',
      test: () => content.includes('backdrop-blur-xl bg-white/5') && content.includes('border-white/10')
    }
  ];

  console.log('\n🎨 Résultats des vérifications du header:');
  console.log('-'.repeat(40));

  let allPassed = true;
  headerChecks.forEach((check, index) => {
    const passed = check.test();
    console.log(`${index + 1}. ${check.name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    if (!passed) allPassed = false;
  });

  console.log('\n💎 Éléments du header détectés:');
  console.log('-'.repeat(40));
  
  const headerElements = [
    { name: 'Header avec backdrop-blur', found: content.includes('backdrop-blur-xl bg-white/5') },
    { name: 'Bouton retour avec SVG', found: content.includes('M15 19l-7-7 7-7') },
    { name: 'Titre principal', found: content.includes('Gestionnaire de Badges') },
    { name: 'Sous-titre', found: content.includes('Découvre et gère tes badges') },
    { name: 'Avatar avec gradient violet', found: content.includes('from-purple-400 to-pink-400') },
    { name: 'Icône badge', found: content.includes('🏆') },
    { name: 'Affichage profil', found: content.includes('profileId') },
    { name: 'Navigation goBack', found: content.includes('goBack()') },
    { name: 'Redirection dashboard', found: content.includes('user-dashboard') },
    { name: 'Styles CSS header', found: content.includes('header {') },
    { name: 'Effets hover', found: content.includes('header button:hover') },
    { name: 'Transitions', found: content.includes('transition: all 0.3s ease') }
  ];

  headerElements.forEach(element => {
    console.log(`${element.found ? '✅' : '❌'} ${element.name}`);
  });

  console.log('\n📊 Statistiques du fichier:');
  console.log('-'.repeat(40));
  console.log(`Lignes totales: ${content.split('\n').length}`);
  console.log(`Caractères: ${content.length}`);
  console.log(`Balises header: ${(content.match(/<header/g) || []).length}`);
  console.log(`Balises nav: ${(content.match(/<nav/g) || []).length}`);
  console.log(`Boutons: ${(content.match(/<button/g) || []).length}`);
  console.log(`SVG: ${(content.match(/<svg/g) || []).length}`);

  console.log('\n🎯 Fonctionnalités du header:');
  console.log('-'.repeat(40));
  console.log('🔙 Bouton retour avec navigation intelligente');
  console.log('📱 Design responsive avec container');
  console.log('🎨 Style Liquid Glass cohérent');
  console.log('👤 Affichage du profil utilisateur');
  console.log('🏆 Icône badge dans l\'avatar');
  console.log('✨ Effets hover et transitions');
  console.log('🔄 Redirection vers user-dashboard');

  console.log('\n🔍 Structure du header:');
  console.log('-'.repeat(40));
  console.log('📱 Container responsive');
  console.log('🔙 Bouton retour à gauche');
  console.log('📝 Titre et description au centre');
  console.log('👤 Avatar et profil à droite');
  console.log('🎨 Design glass avec backdrop-blur');

  console.log('\n🎨 Couleurs du header:');
  console.log('-'.repeat(40));
  console.log('🟣 Violet-rose: Avatar et accents');
  console.log('⚪ Blanc: Texte principal');
  console.log('⚫ Transparence: Fond glass');
  console.log('🔍 Bordures: Blanc semi-transparent');

  if (allPassed) {
    console.log('\n✅ Toutes les vérifications sont passées !');
    console.log('Le header a été correctement ajouté au BadgeManager.vue.');
    console.log('\n🏆 Le header inclut:');
    console.log('  - Bouton de retour avec navigation intelligente');
    console.log('  - Titre et description de la page');
    console.log('  - Avatar avec icône badge');
    console.log('  - Design Liquid Glass cohérent');
    console.log('  - Styles et animations fluides');
  } else {
    console.log('\n❌ Certaines vérifications ont échoué.');
    console.log('Veuillez corriger les erreurs détectées.');
  }

} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier:', error.message);
}
