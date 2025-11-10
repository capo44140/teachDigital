// Test simple de l'API
const API_URL = 'https://lespoires.synology.me:3001/';

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
