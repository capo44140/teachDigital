#!/usr/bin/env node

/**
 * Script de vérification du fichier NotificationTest.vue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Vérification du fichier NotificationTest.vue');
console.log('=' .repeat(50));

const filePath = path.join(__dirname, '..', 'src', 'components', 'NotificationTest.vue');

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
      name: 'Balises main ouvertes/fermées',
      test: () => {
        const openTags = (content.match(/<main/g) || []).length;
        const closeTags = (content.match(/<\/main>/g) || []).length;
        return openTags === closeTags && openTags === 1;
      }
    },
    {
      name: 'Balises div ouvertes/fermées',
      test: () => {
        const openTags = (content.match(/<div/g) || []).length;
        const closeTags = (content.match(/<\/div>/g) || []).length;
        return openTags === closeTags;
      }
    },
    {
      name: 'Design Liquid Glass présent',
      test: () => {
        return content.includes('glass-card-dashboard') && 
               content.includes('backdrop-blur-xl') &&
               content.includes('bg-white/10');
      }
    },
    {
      name: 'Script section présente',
      test: () => {
        return content.includes('<script>') && content.includes('</script>');
      }
    },
    {
      name: 'Style section présente',
      test: () => {
        return content.includes('<style scoped>') && content.includes('</style>');
      }
    }
  ];

  console.log('\n📊 Résultats des vérifications:');
  console.log('-'.repeat(40));

  let allPassed = true;
  checks.forEach((check, index) => {
    const passed = check.test();
    console.log(`${index + 1}. ${check.name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    if (!passed) allPassed = false;
  });

  console.log('\n🎨 Éléments Liquid Glass détectés:');
  console.log('-'.repeat(40));
  
  const liquidGlassElements = [
    { name: 'glass-card-dashboard', found: content.includes('glass-card-dashboard') },
    { name: 'backdrop-blur-xl', found: content.includes('backdrop-blur-xl') },
    { name: 'bg-white/10', found: content.includes('bg-white/10') },
    { name: 'border-white/20', found: content.includes('border-white/20') },
    { name: 'gradient-to-r', found: content.includes('gradient-to-r') },
    { name: 'animate-blob', found: content.includes('animate-blob') }
  ];

  liquidGlassElements.forEach(element => {
    console.log(`${element.found ? '✅' : '❌'} ${element.name}`);
  });

  console.log('\n📈 Statistiques du fichier:');
  console.log('-'.repeat(40));
  console.log(`Lignes totales: ${content.split('\n').length}`);
  console.log(`Caractères: ${content.length}`);
  console.log(`Balises div: ${(content.match(/<div/g) || []).length}`);
  console.log(`Classes CSS: ${(content.match(/class="/g) || []).length}`);

  if (allPassed) {
    console.log('\n✅ Toutes les vérifications sont passées !');
    console.log('Le fichier NotificationTest.vue est correctement formaté.');
  } else {
    console.log('\n❌ Certaines vérifications ont échoué.');
    console.log('Veuillez corriger les erreurs détectées.');
  }

} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier:', error.message);
}
