// Service Worker pour TeachDigital PWA
const CACHE_NAME = 'teachdigital-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur lors de la mise en cache', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la ressource mise en cache si disponible
        if (response) {
          console.log('📱 Service Worker: Ressource trouvée en cache', event.request.url);
          return response;
        }
        
        // Sinon, faire la requête réseau
        console.log('🌐 Service Worker: Requête réseau', event.request.url);
        return fetch(event.request);
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur lors de la requête', error);
        // Retourner une page d'erreur personnalisée si nécessaire
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Gestion des notifications push (pour futures fonctionnalités)
self.addEventListener('push', (event) => {
  console.log('📢 Service Worker: Notification push reçue');
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification de TeachDigital',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ouvrir l\'application',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('TeachDigital', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Clic sur notification', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
