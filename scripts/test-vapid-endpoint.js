/**
 * Script de test pour l'endpoint VAPID
 * Vérifie que l'endpoint /api/vapid-public-key fonctionne correctement
 */

async function testVapidEndpoint() {
  console.log('🧪 Test de l\'endpoint VAPID...');
  
  const endpoints = [
    'https://teachdigital.vercel.app/api/vapid-public-key',
    'http://localhost:3000/api/vapid-public-key'
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🔍 Test de ${endpoint}...`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📊 Statut: ${response.status} ${response.statusText}`);
      
      // Vérifier les headers CORS
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };
      
      console.log('🌐 Headers CORS:', corsHeaders);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Réponse:', data);
        
        if (data.success && data.publicKey) {
          console.log('✅ Clé VAPID publique récupérée avec succès');
          console.log(`🔑 Clé: ${data.publicKey.substring(0, 20)}...`);
        } else {
          console.log('❌ Format de réponse incorrect');
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Erreur:', errorText);
      }
      
    } catch (error) {
      console.log('❌ Erreur de connexion:', error.message);
    }
  }
  
  console.log('\n📋 Instructions pour résoudre les problèmes CORS :');
  console.log('1. Vérifiez que l\'endpoint est déployé sur Vercel');
  console.log('2. Vérifiez les variables d\'environnement VAPID');
  console.log('3. Vérifiez la configuration CORS dans vercel.json');
  console.log('4. Testez avec curl: curl -H "Origin: http://localhost:3000" https://teachdigital.vercel.app/api/vapid-public-key');
}

// Exécuter si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testVapidEndpoint().catch(console.error);
}

export { testVapidEndpoint };
