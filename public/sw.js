// Service Worker pour TeachDigital PWA
// Version dynamique basée sur la date de build
const BUILD_VERSION = 'teachdigital-v' + new Date().getTime();
const CACHE_NAME = BUILD_VERSION;
const STATIC_CACHE = 'teachdigital-static-v1';
const DYNAMIC_CACHE = 'teachdigital-dynamic-v1';

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
  console.log('🔧 Service Worker: Installation - Version:', BUILD_VERSION);
  
  // Forcer l'activation immédiate du nouveau service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Mise en cache des ressources statiques');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Nettoyer les anciens caches
        return caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                console.log('🗑️ Service Worker: Suppression ancien cache', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur lors de la mise en cache', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation - Version:', BUILD_VERSION);
  
  // Prendre le contrôle immédiatement de tous les clients
  event.waitUntil(
    self.clients.claim().then(() => {
      // Nettoyer les anciens caches
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Suppression ancien cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});

// Interception des requêtes avec stratégie de cache améliorée
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Stratégie différente selon le type de ressource
  if (request.method === 'GET') {
    // Pour les ressources statiques (HTML, CSS, JS, images)
    if (urlsToCache.some(cachedUrl => request.url.includes(cachedUrl.split('/').pop()))) {
      event.respondWith(
        caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📱 Service Worker: Ressource statique en cache', request.url);
              return cachedResponse;
            }
            
            // Si pas en cache, récupérer du réseau et mettre en cache
            return fetch(request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return networkResponse;
            });
          })
      );
    } else {
      // Pour les autres ressources (API, données dynamiques)
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            // Mettre en cache les réponses réussies
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // En cas d'erreur réseau, essayer le cache
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                console.log('📱 Service Worker: Ressource dynamique en cache (fallback)', request.url);
                return cachedResponse;
              }
              
              // Dernier recours : page d'accueil
              if (request.destination === 'document') {
                return caches.match('/index.html');
              }
            });
          })
      );
    }
  } else {
    // Pour les requêtes non-GET, toujours aller au réseau
    event.respondWith(fetch(request));
  }
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
