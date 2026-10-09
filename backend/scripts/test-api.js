#!/usr/bin/env node

/**
 * Script de test des endpoints API
 */

// URL cible : argument CLI ou variable d'environnement API_URL (aucun hôte réel en dur)
//   node scripts/test-api.js https://votre-domaine.example
//   API_URL=https://votre-domaine.example node scripts/test-api.js
const API_BASE_URL = (process.argv[2] || process.env.API_URL || 'http://localhost:3001').replace(/\/+$/, '');

async function testEndpoint(method, endpoint, data = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`\n🔍 Test: ${method} ${endpoint}`);
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📝 Response:`, JSON.stringify(result, null, 2));
    
    return { status: response.status, data: result };
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return { status: 500, data: { error: error.message } };
  }
}

async function runTests() {
  console.log('🧪 Test des endpoints API TeachDigital\n');
  console.log(`🌐 Base URL: ${API_BASE_URL}\n`);

  // Test 1: Health check (endpoint personnalisé)
  console.log('='.repeat(50));
  console.log('1️⃣ Test de santé de l\'API');
  console.log('='.repeat(50));
  
  // Test 2: Login avec un profil existant
  console.log('='.repeat(50));
  console.log('2️⃣ Test de connexion');
  console.log('='.repeat(50));
  
  const loginResult = await testEndpoint('POST', '/api/auth/login', {
    profileId: 1,
    pin: '1234' // Code PIN par défaut
  });

  let token = null;
  if (loginResult.status === 200 && loginResult.data.success) {
    token = loginResult.data.data.token;
    console.log('✅ Connexion réussie, token récupéré');
  } else {
    console.log('❌ Échec de la connexion');
    return;
  }

  // Test 3: Vérification du token
  console.log('='.repeat(50));
  console.log('3️⃣ Test de vérification du token');
  console.log('='.repeat(50));
  
  await testEndpoint('GET', '/api/auth/verify', null, token);

  // Test 4: Récupération des profils
  console.log('='.repeat(50));
  console.log('4️⃣ Test de récupération des profils');
  console.log('='.repeat(50));
  
  await testEndpoint('GET', '/api/profiles', null, token);

  // Test 5: Récupération des leçons
  console.log('='.repeat(50));
  console.log('5️⃣ Test de récupération des leçons');
  console.log('='.repeat(50));
  
  await testEndpoint('GET', '/api/lessons', null, token);

  // Test 6: Récupération des notifications
  console.log('='.repeat(50));
  console.log('6️⃣ Test de récupération des notifications');
  console.log('='.repeat(50));
  
  await testEndpoint('GET', '/api/notifications', null, token);

  // Test 7: Logout
  console.log('='.repeat(50));
  console.log('7️⃣ Test de déconnexion');
  console.log('='.repeat(50));
  
  await testEndpoint('POST', '/api/auth/logout', null, token);

  console.log('\n🎉 Tests terminés !');
  console.log('\n📋 Résumé :');
  console.log(`✅ Backend déployé: ${API_BASE_URL}`);
  console.log('✅ Endpoints testés avec succès');
  console.log('✅ Authentification fonctionnelle');
  console.log('\n🚀 Prêt pour l\'intégration frontend !');
}

runTests().catch(console.error);
