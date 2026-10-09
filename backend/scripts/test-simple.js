// Test simple de l'API
// URL cible : argument CLI ou variable d'environnement API_URL (aucun hôte réel en dur)
//   node scripts/test-simple.js https://votre-domaine.example
//   API_URL=https://votre-domaine.example node scripts/test-simple.js
const API_URL = (process.argv[2] || process.env.API_URL || 'http://localhost:3001').replace(/\/+$/, '');

async function testAPI() {
  console.log('🧪 Test simple de l\'API\n');
  
  try {
    // Test 1: Vérifier que l'API répond
    console.log('1️⃣ Test de base...');
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId: 1,
        pin: '1234'
      })
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 200)}...`);
    
    if (response.status === 200) {
      console.log('✅ API fonctionne !');
    } else {
      console.log('❌ Problème avec l\'API');
    }
    
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

testAPI();
