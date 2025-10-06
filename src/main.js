import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import UpdateNotification from './components/UpdateNotification.vue'
import { updateService } from './services/updateService.js'

// Créer l'instance Pinia
const pinia = createPinia()

// Créer l'application Vue
const app = createApp(App)

// Enregistrer le composant global
app.component('UpdateNotification', UpdateNotification)

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
              
              // Utiliser la popup personnalisée au lieu de confirm()
              updateService.showUpdateNotification('0.0.15', '0.0.16');
            }
          });
        });
      })
      .catch((error) => {
        console.log('❌ Échec de l\'enregistrement du Service Worker:', error);
      });
  });
}

// Fournir le service de mise à jour globalement
app.provide('updateService', updateService)

app.use(pinia).use(router).mount('#app')
