import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Enregistrement du Service Worker pour PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré avec succès:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ Échec de l\'enregistrement du Service Worker:', error);
      });
  });
}

createApp(App).use(router).mount('#app')
