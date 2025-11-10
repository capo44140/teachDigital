// Test CORS simple
const API_URL = 'http://lespoires.synology.me:3001';

async function testCors() {
  console.log('🧪 Test CORS du backend\n');
  
  try {
    // Test 1: OPTIONS request (preflight)
    console.log('1️⃣ Test OPTIONS (preflight)...');
    const optionsResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`Status: ${optionsResponse.status}`);
    console.log('Headers CORS:');
    console.log('- Access-Control-Allow-Origin:', optionsResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('- Access-Control-Allow-Methods:', optionsResponse.headers.get('Access-Control-Allow-Methods'));
    console.log('- Access-Control-Allow-Headers:', optionsResponse.headers.get('Access-Control-Allow-Headers'));
    
    // Test 2: POST request
    console.log('\n2️⃣ Test POST...');
    const postResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId: 1,
        pin: '1234'
      })
    });
    
    console.log(`Status: ${postResponse.status}`);
    const text = await postResponse.text();
    console.log(`Response: ${text.substring(0, 200)}...`);
    
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

testCors();
