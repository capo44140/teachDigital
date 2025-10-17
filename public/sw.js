// Service Worker pour TeachDigital PWA
// Version dynamique basée sur la date de build
const BUILD_VERSION = 'teachdigital-v' + new Date().getTime();
const CACHE_NAME = BUILD_VERSION;
const STATIC_CACHE = 'teachdigital-static-v2';
const DYNAMIC_CACHE = 'teachdigital-dynamic-v2';
const CRITICAL_DATA_CACHE = 'teachdigital-critical-v1';
const API_CACHE = 'teachdigital-api-v1';

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

// URLs critiques pour le mode offline
const criticalUrls = [
  '/api/profiles',
  '/api/lessons',
  '/api/notifications'
];

// Configuration des stratégies de cache
const CACHE_STRATEGIES = {
  // Cache First - pour les assets statiques
  CACHE_FIRST: 'cache-first',
  // Network First - pour les données API
  NETWORK_FIRST: 'network-first',
  // Stale While Revalidate - pour les données critiques
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Network Only - pour les actions importantes
  NETWORK_ONLY: 'network-only'
};

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
      event.respondWith(handleStaticResource(request));
    }
    // Pour les données critiques (API)
    else if (criticalUrls.some(criticalUrl => url.pathname.startsWith(criticalUrl))) {
      event.respondWith(handleCriticalData(request));
    }
    // Pour les autres ressources API
    else if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiRequest(request));
    }
    // Pour les autres ressources
    else {
      event.respondWith(handleDynamicResource(request));
    }
  } else {
    // Pour les requêtes non-GET, toujours aller au réseau
    event.respondWith(fetch(request));
  }
});

// Gestion des ressources statiques (Cache First)
async function handleStaticResource(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📱 Service Worker: Ressource statique en cache', request.url);
      return cachedResponse;
    }
    
    // Si pas en cache, récupérer du réseau et mettre en cache
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    console.error('Erreur lors de la gestion de la ressource statique:', error);
    return new Response('Ressource non disponible', { status: 404 });
  }
}

// Gestion des données critiques (Stale While Revalidate)
async function handleCriticalData(request) {
  try {
    const cache = await caches.open(CRITICAL_DATA_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Toujours essayer le réseau en arrière-plan
    const networkPromise = fetch(request).then(async (networkResponse) => {
      if (networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        await cache.put(request, responseClone);
      }
      return networkResponse;
    }).catch(() => null);
    
    // Retourner le cache immédiatement s'il existe
    if (cachedResponse) {
      console.log('📱 Service Worker: Données critiques en cache (stale-while-revalidate)', request.url);
      // Mettre à jour en arrière-plan
      networkPromise;
      return cachedResponse;
    }
    
    // Si pas de cache, attendre le réseau
    const networkResponse = await networkPromise;
    if (networkResponse) {
      return networkResponse;
    }
    
    throw new Error('Pas de données disponibles');
  } catch (error) {
    console.error('Erreur lors de la gestion des données critiques:', error);
    return new Response(JSON.stringify({ 
      error: 'Données non disponibles en mode offline',
      offline: true 
    }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Gestion des requêtes API (Network First)
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(API_CACHE);
      await cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    console.log('📱 Service Worker: Tentative de récupération depuis le cache API', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Dernier recours : réponse d'erreur
    return new Response(JSON.stringify({ 
      error: 'Service non disponible',
      offline: true 
    }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Gestion des ressources dynamiques
async function handleDynamicResource(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📱 Service Worker: Ressource dynamique en cache (fallback)', request.url);
      return cachedResponse;
    }
    
    // Dernier recours : page d'accueil pour les documents
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Gestion des notifications push avancées
self.addEventListener('push', (event) => {
  console.log('📢 Service Worker: Notification push reçue');
  
  let notificationData = {
    title: 'TeachDigital',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      timestamp: Date.now(),
      url: '/'
    }
  };

  // Parser les données de la notification si disponibles
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
        data: {
          ...notificationData.data,
          ...pushData.data
        }
      };
    } catch (error) {
      // Si ce n'est pas du JSON, traiter comme du texte
      notificationData.body = event.data.text();
    }
  }

  // Configuration des actions selon le type de notification
  const actions = getNotificationActions(notificationData.data?.type);
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: actions,
    requireInteraction: notificationData.data?.requireInteraction || false,
    silent: notificationData.data?.silent || false,
    tag: notificationData.data?.tag || 'teachdigital-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Clic sur notification', event.action);
  
  const notification = event.notification;
  const data = notification.data || {};
  
  // Fermer la notification
  notification.close();
  
  // Gérer les actions
  event.waitUntil(handleNotificationAction(event.action, data));
});

// Gestion des actions de notification
async function handleNotificationAction(action, data) {
  const { type, profileId, lessonId, url } = data;
  
  let targetUrl = '/';
  
  // Déterminer l'URL cible selon l'action et le type
  switch (action) {
    case 'open':
      targetUrl = url || getDefaultUrlForType(type, profileId, lessonId);
      break;
    case 'quiz':
      targetUrl = `/quiz/${lessonId}?profile=${profileId}`;
      break;
    case 'profile':
      targetUrl = `/profile/${profileId}`;
      break;
    case 'achievements':
      targetUrl = `/profile/${profileId}?tab=achievements`;
      break;
    case 'progress':
      targetUrl = `/profile/${profileId}?tab=progress`;
      break;
    case 'dismiss':
      // Marquer comme lue (optionnel)
      return;
    default:
      targetUrl = getDefaultUrlForType(type, profileId, lessonId);
  }
  
  // Ouvrir ou focuser l'application
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  
  // Chercher une fenêtre existante
  for (const client of clients) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      await client.focus();
      await client.navigate(targetUrl);
      return;
    }
  }
  
  // Ouvrir une nouvelle fenêtre
  await self.clients.openWindow(targetUrl);
}

// Obtenir l'URL par défaut selon le type de notification
function getDefaultUrlForType(type, profileId, lessonId) {
  switch (type) {
    case 'quiz_reminder':
      return lessonId ? `/quiz/${lessonId}?profile=${profileId}` : `/?profile=${profileId}`;
    case 'achievement':
      return `/profile/${profileId}?tab=achievements`;
    case 'progress_update':
      return `/profile/${profileId}?tab=progress`;
    case 'lesson_available':
      return lessonId ? `/lesson/${lessonId}?profile=${profileId}` : `/?profile=${profileId}`;
    case 'parent_notification':
      return `/parent-dashboard?profile=${profileId}`;
    default:
      return profileId ? `/?profile=${profileId}` : '/';
  }
}

// Obtenir les actions selon le type de notification
function getNotificationActions(type) {
  const baseActions = [
    {
      action: 'open',
      title: 'Ouvrir',
      icon: '/icons/icon-72x72.png'
    },
    {
      action: 'dismiss',
      title: 'Ignorer',
      icon: '/icons/icon-72x72.png'
    }
  ];
  
  switch (type) {
    case 'quiz_reminder':
      return [
        {
          action: 'quiz',
          title: 'Faire le Quiz',
          icon: '/icons/icon-72x72.png'
        },
        ...baseActions
      ];
    case 'achievement':
      return [
        {
          action: 'achievements',
          title: 'Voir les Badges',
          icon: '/icons/icon-72x72.png'
        },
        ...baseActions
      ];
    case 'progress_update':
      return [
        {
          action: 'progress',
          title: 'Voir la Progression',
          icon: '/icons/icon-72x72.png'
        },
        ...baseActions
      ];
    default:
      return baseActions;
  }
}

// Gestion de la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Service Worker: Notification fermée', event.notification.tag);
  
  // Optionnel: tracker les notifications fermées
  const data = event.notification.data || {};
  if (data.trackClose) {
    // Envoyer une requête pour tracker la fermeture
    fetch('/api/notification-closed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: event.notification.tag,
        timestamp: Date.now(),
        data: data
      })
    }).catch(console.error);
  }
});
