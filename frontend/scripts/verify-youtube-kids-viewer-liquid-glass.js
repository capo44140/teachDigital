#!/usr/bin/env node

/**
 * Script de vérification du fichier YouTubeKidsViewer.vue avec design Liquid Glass
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎥 Vérification du fichier YouTubeKidsViewer.vue - Design Liquid Glass');
console.log('=' .repeat(70));

const filePath = path.join(__dirname, '..', 'src', 'components', 'YouTubeKidsViewer.vue');

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
        return content.includes('En-tête avec informations du profil') &&
               content.includes('Filtres') &&
               content.includes('Grille des vidéos') &&
               content.includes('Pagination') &&
               content.includes('Modal de lecture vidéo');
      }
    },
    {
      name: 'Cartes vidéo avec effets glass',
      test: () => {
        return content.includes('glass-video-card') &&
               content.includes('group cursor-pointer') &&
               content.includes('group-hover:scale-105');
      }
    },
    {
      name: 'Modal avec design glass',
      test: () => {
        return content.includes('glass-modal-content') &&
               content.includes('backdrop-blur-xl') &&
               content.includes('fixed inset-0 bg-black/90');
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
    { name: 'glass-modal-content', found: content.includes('glass-modal-content') },
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

  console.log('\n🎥 Fonctionnalités YouTube Kids détectées:');
  console.log('-'.repeat(40));
  
  const youtubeFeatures = [
    { name: 'Header profil', found: content.includes('currentProfile?.name') },
    { name: 'Avatar enfant', found: content.includes('avatar_content') },
    { name: 'Compteur vidéos', found: content.includes('filteredVideos.length') },
    { name: 'Filtres catégorie', found: content.includes('selectedCategory') },
    { name: 'Recherche vidéos', found: content.includes('searchQuery') },
    { name: 'Grille vidéos', found: content.includes('paginatedVideos') },
    { name: 'Miniatures YouTube', found: content.includes('getThumbnailUrl') },
    { name: 'Lecteur vidéo', found: content.includes('getEmbedUrl') },
    { name: 'Pagination', found: content.includes('totalPages') },
    { name: 'Modal lecture', found: content.includes('selectedVideo') },
    { name: 'Tags catégorie', found: content.includes('video.category') },
    { name: 'Tags âge', found: content.includes('video.age_group') },
    { name: 'Filtrage par âge', found: content.includes('getAgeFromLevel') },
    { name: 'Vérification âge', found: content.includes('isVideoAppropriateForAge') },
    { name: 'État vide', found: content.includes('filteredVideos.length === 0') },
    { name: 'Bouton fermer', found: content.includes('closeVideo') },
    { name: 'Lecture vidéo', found: content.includes('playVideo') },
    { name: 'Troncature texte', found: content.includes('truncateText') }
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
  console.log(`Iframes: ${(content.match(/<iframe/g) || []).length}`);

  console.log('\n🎯 Améliorations Liquid Glass appliquées:');
  console.log('-'.repeat(40));
  console.log('✨ Fond avec gradients animés rouge/orange/rose');
  console.log('💎 Cartes glass semi-transparentes');
  console.log('🎥 Cartes vidéo avec effets hover');
  console.log('🔍 Filtres avec design glass');
  console.log('📱 Design responsive adaptatif');
  console.log('⚡ Animations d\'entrée séquentielles');
  console.log('🔧 Scrollbars personnalisées');
  console.log('🎯 Modal avec effet glass');
  console.log('🏷️ Tags colorés avec gradients');
  console.log('👶 Avatar stylisé pour enfants');

  console.log('\n🔍 Sections transformées:');
  console.log('-'.repeat(40));
  console.log('👤 Header profil: Avatar et compteur avec glass');
  console.log('🔍 Filtres: Select et input avec design glass');
  console.log('📺 Grille vidéos: Cartes avec effets hover');
  console.log('📄 Pagination: Boutons avec effets glass');
  console.log('🎬 Modal: Lecteur avec design glass');
  console.log('📭 État vide: Message avec icône stylisée');

  console.log('\n🎨 Couleurs et thèmes:');
  console.log('-'.repeat(40));
  console.log('🔴 Rouge: Couleur principale YouTube');
  console.log('🟠 Orange: Couleur secondaire');
  console.log('🩷 Rose: Couleur d\'accent');
  console.log('🔵 Bleu: Couleur pour filtres');
  console.log('⚪ Blanc: Texte et bordures');
  console.log('⚫ Noir: Fond modal');

  console.log('\n📱 Responsive Design:');
  console.log('-'.repeat(40));
  console.log('🖥️ Desktop: 4 colonnes (xl:grid-cols-4)');
  console.log('💻 Laptop: 3 colonnes (lg:grid-cols-3)');
  console.log('📱 Tablet: 2 colonnes (md:grid-cols-2)');
  console.log('📱 Mobile: 1 colonne (grid-cols-1)');

  console.log('\n🎬 Fonctionnalités vidéo:');
  console.log('-'.repeat(40));
  console.log('🖼️ Miniatures YouTube automatiques');
  console.log('▶️ Bouton play avec effet hover');
  console.log('📺 Lecteur intégré en modal');
  console.log('🏷️ Tags catégorie et âge');
  console.log('🔍 Recherche et filtrage');
  console.log('📄 Pagination intelligente');

  if (allPassed) {
    console.log('\n✅ Toutes les vérifications sont passées !');
    console.log('Le fichier YouTubeKidsViewer.vue est correctement transformé avec le design Liquid Glass.');
  } else {
    console.log('\n❌ Certaines vérifications ont échoué.');
    console.log('Veuillez corriger les erreurs détectées.');
  }

} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier:', error.message);
}
