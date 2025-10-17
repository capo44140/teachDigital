/**
 * Script pour générer les clés VAPID
 * Utilisé pour les notifications push PWA
 */

import webpush from 'web-push';

function generateVapidKeys() {
  console.log('🔑 Génération des clés VAPID...');
  
  try {
    const vapidKeys = webpush.generateVAPIDKeys();
    
    console.log('\n✅ Clés VAPID générées avec succès !');
    console.log('\n📋 Ajoutez ces clés à vos variables d\'environnement :');
    console.log('\n# Backend (.env)');
    console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    
    console.log('\n# Frontend (.env.local)');
    console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    
    console.log('\n# Vercel (Variables d\'environnement)');
    console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    
    console.log('\n⚠️  IMPORTANT :');
    console.log('- Gardez la clé privée SECRÈTE');
    console.log('- Ne commitez JAMAIS ces clés dans le code');
    console.log('- Utilisez des variables d\'environnement');
    console.log('- Régénérez les clés pour la production');
    
    return vapidKeys;
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des clés VAPID:', error);
    console.log('\n💡 Solution :');
    console.log('1. Installez web-push : npm install web-push');
    console.log('2. Ou utilisez : npx web-push generate-vapid-keys');
    return null;
  }
}

// Exécuter si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  generateVapidKeys();
}

export { generateVapidKeys };
