#!/usr/bin/env node

/**
 * Script de test pour vérifier la connexion à l'API badges
 */

// Ce script s'exécute en Node.js: ne pas importer les services frontend (localStorage, etc.)
// Variables requises:
// - API_URL (ex: http://localhost:3001)
// - AUTH_TOKEN (token JWT admin)

async function testBadgeApi() {
  try {
    console.log('🧪 Test de connexion à l\'API badges...');

    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const token = process.env.AUTH_TOKEN;

    if (!token) {
      console.error('❌ AUTH_TOKEN manquant (JWT admin requis)');
      process.exit(1);
    }

    console.log(`📍 URL de l'API: ${apiUrl}`);
    
    // Test de récupération des badges
    console.log('📡 Tentative de récupération des badges...');
    const response = await fetch(`${apiUrl}/api/badges`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erreur HTTP ${response.status}: ${text.substring(0, 200)}`);
    }

    const json = await response.json();
    const badges = json.data || [];
    
    console.log(`✅ Connexion réussie! ${badges.length} badges trouvés.`);
    
    if (badges.length > 0) {
      console.log('\n📋 Badges existants:');
      badges.forEach((badge, index) => {
        console.log(`${index + 1}. ${badge.icon} ${badge.name} (${badge.category})`);
      });
    } else {
      console.log('\n📝 Aucun badge trouvé. Prêt pour l\'initialisation!');
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Suggestions:');
      console.log('1. Vérifiez que le backend est démarré (npm run dev dans le dossier backend)');
      console.log('2. Vérifiez que l\'URL de l\'API est correcte');
      console.log('3. Vérifiez que les variables d\'environnement sont configurées');
    }
    
    process.exit(1);
  }
}

// Exécuter le test
testBadgeApi()
  .then(() => {
    console.log('\n✨ Test terminé.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
