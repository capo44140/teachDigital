// Service Worker pour TeachDigital PWA
// Seul Service Worker de l'application (enregistré dans src/main.js).
// BUILD_VERSION et PRECACHE_ASSETS sont remplacés au build par scripts/generate-sw.js
// (même version que dist/version.json ; liste des fichiers de dist/.vite/manifest.json).
const BUILD_VERSION = 'teachdigital-dev';
const PRECACHE_ASSETS = [];

// Caches versionnés : chaque déploiement repart d'un précache propre
const STATIC_CACHE = `teachdigital-static-${BUILD_VERSION}`;
// Assets Vite hachés (/assets/*) : immuables, conservés d'un build à l'autre
// (un onglet resté sur l'ancienne version peut encore charger ses chunks)
const ASSET_CACHE = 'teachdigital-assets-v1';
// Anciens assets conservés au-delà du build courant (ceux du build courant ne sont jamais supprimés)
const MAX_OLD_ASSET_ENTRIES = 150;
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

// Limiter la taille du cache des assets : ceux du build courant sont conservés,
// les plus anciens des autres sont supprimés en premier
async function trimAssetCache() {
  const cache = await caches.open(ASSET_CACHE);
  const requests = await cache.keys();
  const current = new Set(PRECACHE_ASSETS);
  const oldRequests = requests.filter((request) => !current.has(new URL(request.url).pathname));
  const excess = oldRequests.length - MAX_OLD_ASSET_ENTRIES;
  if (excess > 0) {
    await Promise.all(oldRequests.slice(0, excess).map((request) => cache.delete(request)));
  }
}

// Précacher tous les fichiers du build (chunks de toutes les pages compris) :
// une page jamais visitée reste accessible hors ligne. Les fichiers hachés déjà en cache
// (immuables) ne sont pas retéléchargés ; un échec isolé ne bloque pas l'installation.
async function precacheBuildAssets() {
  if (PRECACHE_ASSETS.length === 0) return;
  const cache = await caches.open(ASSET_CACHE);
  const results = await Promise.allSettled(PRECACHE_ASSETS.map(async (url) => {
    if (await cache.match(url)) return;
    const response = await fetch(new Request(url, { cache: 'reload' }));
    if (!response.ok) throw new Error(`${url} : HTTP ${response.status}`);
    await cache.put(url, response);
  }));
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`⚠️ Service Worker: ${failed.length} fichier(s) non précaché(s)`, failed.map((f) => f.reason?.message));
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
    Promise.all([
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('📦 Service Worker: Mise en cache des ressources statiques');
          return cache.addAll(urlsToCache.map((url) => new Request(url, { cache: 'reload' })));
        })
        .catch((error) => {
          console.error('❌ Service Worker: Erreur lors de la mise en cache', error);
        }),
      precacheBuildAssets()
    ])
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
