// Test local de l'API
// URL cible : argument CLI ou variable d'environnement API_URL (aucun hôte réel en dur)
//   node scripts/test-local.js https://votre-domaine.example
//   API_URL=https://votre-domaine.example node scripts/test-local.js
const API_URL = (process.argv[2] || process.env.API_URL || 'http://localhost:3001').replace(/\/+$/, '');

async function testLocalAPI() {
  console.log('🧪 Test local de l\'API\n');
  console.log('⏳ Attendez que le serveur local démarre...\n');
  
  // Attendre un peu pour que le serveur démarre
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // Test 1: Vérifier que l'API répond
    console.log('1️⃣ Test de connexion...');
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
    
    const text = await response.text();
    console.log(`Response: ${text}`);
    
    if (response.status === 200) {
      console.log('✅ API locale fonctionne !');
      
      // Test 2: Tester avec le token
      const data = JSON.parse(text);
      if (data.success && data.data.token) {
        console.log('\n2️⃣ Test avec token...');
        
        const profileResponse = await fetch(`${API_URL}/api/profiles`, {
          headers: {
            'Authorization': `Bearer ${data.data.token}`
          }
        });
        
        console.log(`Profiles Status: ${profileResponse.status}`);
        const profilesText = await profileResponse.text();
        console.log(`Profiles Response: ${profilesText.substring(0, 200)}...`);
      }
    } else {
      console.log('❌ Problème avec l\'API locale');
    }
    
  } catch (error) {
    console.log('❌ Erreur:', error.message);
    console.log('💡 Assurez-vous que le serveur local est démarré avec: pnpm dev (dans backend/)');
  }
}

testLocalAPI();
