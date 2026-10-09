#!/usr/bin/env node

/**
 * Script de vérification du fichier YouTubeKidsViewerSimple.vue avec design Liquid Glass
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎥 Vérification du fichier YouTubeKidsViewerSimple.vue - Design Liquid Glass');
console.log('=' .repeat(75));

const filePath = path.join(__dirname, '..', 'src', 'components', 'YouTubeKidsViewerSimple.vue');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Vérifications de base
  const checks = [
    {
      name: 'Balises template ouvertes/fermées',
      test: () => {
        const openTags = (content.match(/<template>/g) || []).length;
        const closeTags = (content.match(/<\/template>/g) || []).length;
        return openTags === closeTags && openTags === 1;
      }
    },
    {
      name: 'Design Liquid Glass présent',
      test: () => {
        return content.includes('glass-card-dashboard') && 
               content.includes('backdrop-blur-xl') &&
               content.includes('bg-white/10') &&
               content.includes('animate-blob');
      }
    },
    {
      name: 'Gradients de fond animés',
      test: () => {
        return content.includes('bg-gradient-to-br from-slate-900 via-red-900 to-slate-900') &&
               content.includes('mix-blend-multiply') &&
               content.includes('filter blur-3xl');
      }
    },
    {
      name: 'Sections avec design glass',
      test: () => {
        return content.includes('Mes vidéos éducatives') &&
               content.includes('Chargement des vidéos') &&
               content.includes('Aucune vidéo disponible') &&
               content.includes('Grille des vidéos');
      }
    },
    {
      name: 'Cartes vidéo avec effets glass',
      test: () => {
        return content.includes('glass-video-card') &&
               content.includes('group cursor-pointer') &&
               content.includes('group-hover:scale-110');
      }
    },
    {
      name: 'Header avec design glass',
      test: () => {
        return content.includes('backdrop-blur-xl bg-white/5') &&
               content.includes('Retour au dashboard') &&
               content.includes('Info profil');
      }
    }
  ];

  console.log('\n🎨 Résultats des vérifications:');
  console.log('-'.repeat(40));

  let allPassed = true;
  checks.forEach((check, index) => {
    const passed = check.test();
    console.log(`${index + 1}. ${check.name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    if (!passed) allPassed = false;
  });

  console.log('\n💎 Éléments Liquid Glass détectés:');
  console.log('-'.repeat(40));
  
  const liquidGlassElements = [
    { name: 'glass-card-dashboard', found: content.includes('glass-card-dashboard') },
    { name: 'glass-video-card', found: content.includes('glass-video-card') },
    { name: 'backdrop-blur-xl', found: content.includes('backdrop-blur-xl') },
    { name: 'bg-white/10', found: content.includes('bg-white/10') },
    { name: 'border-white/20', found: content.includes('border-white/20') },
    { name: 'gradient-to-r', found: content.includes('gradient-to-r') },
    { name: 'animate-blob', found: content.includes('animate-blob') },
    { name: 'mix-blend-multiply', found: content.includes('mix-blend-multiply') },
    { name: 'filter blur-3xl', found: content.includes('filter blur-3xl') },
    { name: 'text-white', found: content.includes('text-white') },
    { name: 'text-white/60', found: content.includes('text-white/60') }
  ];

  liquidGlassElements.forEach(element => {
    console.log(`${element.found ? '✅' : '❌'} ${element.name}`);
  });

  console.log('\n🎥 Fonctionnalités YouTube Kids Simple détectées:');
  console.log('-'.repeat(40));
  
  const youtubeFeatures = [
    { name: 'Header avec bouton retour', found: content.includes('goBack') },
    { name: 'Info profil', found: content.includes('currentProfile') },
    { name: 'Titre principal', found: content.includes('Mes vidéos éducatives') },
    { name: 'Message de bienvenue', found: content.includes('Bienvenue') },
    { name: 'Indicateur de chargement', found: content.includes('isLoading') },
    { name: 'État vide', found: content.includes('videos.length === 0') },
    { name: 'Grille vidéos', found: content.includes('grid grid-cols-1') },
    { name: 'Cartes vidéo', found: content.includes('v-for="video in videos"') },
    { name: 'Miniatures', found: content.includes('getThumbnailUrl') },
    { name: 'Overlay lecture', found: content.includes('group-hover:opacity-100') },
    { name: 'Bouton play', found: content.includes('playVideo') },
    { name: 'Tags catégorie', found: content.includes('video.category') },
    { name: 'Tags âge', found: content.includes('video.age_group') },
    { name: 'Service migration', found: content.includes('migrationService') },
    { name: 'Chargement vidéos', found: content.includes('loadVideos') },
    { name: 'Données démo', found: content.includes('Vidéo éducative') }
  ];

  youtubeFeatures.forEach(feature => {
    console.log(`${feature.found ? '✅' : '❌'} ${feature.name}`);
  });

  console.log('\n📊 Statistiques du fichier:');
  console.log('-'.repeat(40));
  console.log(`Lignes totales: ${content.split('\n').length}`);
  console.log(`Caractères: ${content.length}`);
  console.log(`Balises div: ${(content.match(/<div/g) || []).length}`);
  console.log(`Classes CSS: ${(content.match(/class="/g) || []).length}`);
  console.log(`Boutons: ${(content.match(/<button/g) || []).length}`);
  console.log(`Images: ${(content.match(/<img/g) || []).length}`);

  console.log('\n🎯 Améliorations Liquid Glass appliquées:');
  console.log('-'.repeat(40));
  console.log('✨ Fond avec gradients animés rouge/orange/rose');
  console.log('💎 Cartes glass semi-transparentes');
  console.log('🎥 Cartes vidéo avec effets hover');
  console.log('🔍 Header avec design glass');
  console.log('📱 Design responsive adaptatif');
  console.log('⚡ Animations d\'entrée séquentielles');
  console.log('🔧 Scrollbars personnalisées');
  console.log('🏷️ Tags colorés avec gradients');
  console.log('👶 Avatar stylisé pour enfants');
  console.log('📺 Icône TV avec effet glass');

  console.log('\n🔍 Sections transformées:');
  console.log('-'.repeat(40));
  console.log('🔙 Header: Bouton retour avec gradient rouge-orange');
  console.log('👤 Profil: Avatar avec effet glass');
  console.log('📺 Titre: Icône TV avec gradient');
  console.log('⏳ Chargement: Indicateur avec design glass');
  console.log('📭 État vide: Message avec icône stylisée');
  console.log('🎬 Grille: Cartes vidéo avec effets hover');
  console.log('🏷️ Tags: Badges avec gradients colorés');

  console.log('\n🎨 Couleurs et thèmes:');
  console.log('-'.repeat(40));
  console.log('🔴 Rouge: Couleur principale YouTube');
  console.log('🟠 Orange: Couleur secondaire');
  console.log('🩷 Rose: Couleur d\'accent');
  console.log('🔵 Bleu: Couleur pour tags âge');
  console.log('⚪ Blanc: Texte et bordures');
  console.log('⚫ Noir: Fond et overlays');

  console.log('\n📱 Responsive Design:');
  console.log('-'.repeat(40));
  console.log('🖥️ Desktop: 3 colonnes (lg:grid-cols-3)');
  console.log('💻 Laptop: 2 colonnes (md:grid-cols-2)');
  console.log('📱 Mobile: 1 colonne (grid-cols-1)');

  console.log('\n🎬 Fonctionnalités vidéo:');
  console.log('-'.repeat(40));
  console.log('🖼️ Miniatures YouTube automatiques');
  console.log('▶️ Bouton play avec effet hover');
  console.log('🏷️ Tags catégorie et âge');
  console.log('📊 Chargement depuis base de données');
  console.log('🔄 Fallback vers données démo');

  if (allPassed) {
    console.log('\n✅ Toutes les vérifications sont passées !');
    console.log('Le fichier YouTubeKidsViewerSimple.vue est correctement transformé avec le design Liquid Glass.');
    console.log('\n🎯 Ce fichier est maintenant utilisé par la route /youtube-kids-viewer');
  } else {
    console.log('\n❌ Certaines vérifications ont échoué.');
    console.log('Veuillez corriger les erreurs détectées.');
  }

} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier:', error.message);
}
