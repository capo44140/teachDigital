import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

// Créer l'instance Pinia
const pinia = createPinia()

// Enregistrement du Service Worker pour PWA avec gestion des mises à jour
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none' // Forcer la vérification des mises à jour
    })
      .then((registration) => {
        console.log('✅ Service Worker enregistré avec succès:', registration.scope);
        
        // Vérifier les mises à jour toutes les 30 secondes
        setInterval(() => {
          registration.update();
        }, 30000);
        
        // Écouter les mises à jour disponibles
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker: Mise à jour disponible');
          
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 Service Worker: Nouvelle version installée');
              
              // Notifier l'utilisateur de la mise à jour
              if (confirm('Une nouvelle version de l\'application est disponible. Voulez-vous recharger la page pour l\'utiliser ?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.log('❌ Échec de l\'enregistrement du Service Worker:', error);
      });
  });
}

createApp(App).use(pinia).use(router).mount('#app')
