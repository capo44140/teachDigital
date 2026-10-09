// Service Worker pour TeachDigital PWA
// Seul Service Worker de l'application (enregistré dans src/main.js).
// BUILD_VERSION est remplacé au build par scripts/generate-sw.js (même valeur que dist/version.json).
const BUILD_VERSION = 'teachdigital-dev';

// Caches versionnés : chaque déploiement repart d'un précache propre
const STATIC_CACHE = `teachdigital-static-${BUILD_VERSION}`;
// Assets Vite hachés (/assets/*) : immuables, conservés d'un build à l'autre
// (un onglet resté sur l'ancienne version peut encore charger ses chunks)
const ASSET_CACHE = 'teachdigital-assets-v1';
const MAX_ASSET_ENTRIES = 300;
const CURRENT_CACHES = [STATIC_CACHE, ASSET_CACHE];

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

// Fichiers à ne jamais mettre en cache (détection de mise à jour)
const NEVER_CACHE = ['/version.json', '/sw.js'];

// Réponse générique quand l'API est injoignable (aucune donnée API n'est jamais mise en cache :
// jetons, PIN, progression et notifications ne doivent pas survivre dans le cache du navigateur)
function offlineApiResponse() {
  return new Response(JSON.stringify({
    success: false,
    message: 'Connexion au serveur impossible. Vérifiez votre connexion internet.',
    code: 'OFFLINE',
    offline: true
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function isApiRequest(url) {
  return url.pathname === '/api' || url.pathname.startsWith('/api/');
}

// Supprimer tous les caches qui ne correspondent pas à ce build
// (dont les anciens caches teachdigital-api-* / teachdigital-critical-*)
async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => !CURRENT_CACHES.includes(cacheName))
      .map((cacheName) => {
        console.log('🗑️ Service Worker: Suppression ancien cache', cacheName);
        return caches.delete(cacheName);
      })
  );
}

// Limiter la taille du cache des assets (les plus anciens sont supprimés en premier)
async function trimAssetCache() {
  const cache = await caches.open(ASSET_CACHE);
  const requests = await cache.keys();
  const excess = requests.length - MAX_ASSET_ENTRIES;
  if (excess > 0) {
    await Promise.all(requests.slice(0, excess).map((request) => cache.delete(request)));
  }
}

// Purger toute réponse API éventuellement présente dans les caches
async function purgeApiCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(async (cacheName) => {
    if (/api|critical/i.test(cacheName)) {
      await caches.delete(cacheName);
      return;
    }
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    await Promise.all(
      requests
        .filter((request) => isApiRequest(new URL(request.url)))
        .map((request) => cache.delete(request))
    );
  }));
}

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation - Version:', BUILD_VERSION);

  // Forcer l'activation immédiate du nouveau service worker
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Mise en cache des ressources statiques');
        return cache.addAll(urlsToCache.map((url) => new Request(url, { cache: 'reload' })));
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur lors de la mise en cache', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation - Version:', BUILD_VERSION);

  // Prendre le contrôle immédiatement de tous les clients et nettoyer les anciens caches
  event.waitUntil(
    self.clients.claim()
      .then(() => deleteOldCaches())
      .then(() => trimAssetCache())
  );
});

// Messages de l'application (déconnexion, verrouillage, mise à jour)
self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'PURGE_API_CACHE') {
    event.waitUntil(purgeApiCaches());
  } else if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Requêtes non-GET (POST/PUT/DELETE, keepalive compris) : laissées au navigateur
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API (même origine ou backend distant) : réseau uniquement, jamais de cache
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => offlineApiResponse())
    );
    return;
  }

  // Ressources d'autres origines (miniatures YouTube, polices…) : laissées au navigateur
  if (url.origin !== self.location.origin) return;

  // Fichiers de version : toujours le réseau
  if (NEVER_CACHE.includes(url.pathname)) return;

  // Pages de l'application : réseau d'abord, pour charger la dernière version
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Assets hachés par Vite : immuables, cache d'abord
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(handleHashedAsset(request));
    return;
  }

  // Ressources statiques listées (comparaison exacte du chemin)
  if (urlsToCache.includes(url.pathname)) {
    event.respondWith(handleStaticResource(request));
  }
  // Autres ressources : comportement normal du navigateur (pas de cache SW)
});

// Navigation : réseau d'abord, index.html du précache en secours (mode hors ligne)
async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/index.html');
    if (cachedResponse) {
      console.log('📱 Service Worker: Page servie depuis le cache (hors ligne)', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// Assets hachés (Cache First)
async function handleHashedAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.status === 200) {
    await cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Gestion des ressources statiques (réseau d'abord, précache en secours)
async function handleStaticResource(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📱 Service Worker: Ressource statique en cache', request.url);
      return cachedResponse;
    }
    return new Response('Ressource non disponible', { status: 404 });
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
  // Pas d'appel API ici : le Service Worker ne dispose pas du jeton d'authentification
  console.log('❌ Service Worker: Notification fermée', event.notification.tag);
});
