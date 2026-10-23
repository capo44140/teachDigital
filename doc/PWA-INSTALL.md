# 📱 PWA - TeachDigital

## 🎯 Installer l'application

Dans l'espace parent, **Paramètres > « Installer l'application »** (`InstallAppCard`) propose un
bouton d'installation quand le navigateur le permet. Sinon, la carte affiche les étapes propres au
navigateur. L'ancienne adresse `/settings/pwa` redirige vers `/parent-settings`.

- **iPhone / iPad (Safari)** : bouton Partager > « Sur l'écran d'accueil » > « Ajouter ».
- **Android (Chrome)** : menu ⋮ > « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- **Ordinateur (Chrome / Edge)** : icône d'installation dans la barre d'adresse, ou menu ⋮ >
  « Installer TeachDigital ». Firefox pour ordinateur ne permet pas l'installation.

L'installation exige HTTPS, sauf sur `localhost`.

## ✨ Comportement

- **Hors ligne** : un bandeau (`OfflineBanner`) l'annonce. Les pages déjà construites restent
  consultables, car tous les fichiers du build sont mis en cache. En revanche, rien ne peut être
  chargé ni enregistré : les réponses de l'API ne sont **jamais** mises en cache (jetons, PIN,
  progression).
- **Mises à jour** : l'application compare le build qu'elle exécute (`__APP_VERSION__`) avec
  `/version.json`. La vérification a lieu 5 s après le chargement, puis toutes les 30 min et à
  chaque retour sur l'onglet. Si un nouveau build est disponible, `UpdateNotification` propose de
  recharger (rappel 30 min plus tard en cas de refus). Si un fichier JS d'un ancien build manque
  après un déploiement, la page se recharge une fois automatiquement.
- **Pas de notifications push**.

## 🛠️ Fonctionnement technique

| Élément | Fichier |
| --- | --- |
| Manifest | `frontend/public/manifest.json` |
| Service worker (modèle) | `frontend/public/sw.js` |
| Génération du service worker | `frontend/scripts/generate-sw.js`, lancé par `pnpm run build` |
| Enregistrement et suivi des mises à jour | `src/main.js`, `src/services/updateService.js` |
| Installation | `src/services/installService.js`, `src/components/InstallAppCard.vue` |
| Icônes | `public/icon.svg` → `public/icons/icon-*.png`, `public/favicon-*.png` |

`pnpm run build` enchaîne :

1. `vite build`, qui produit `dist/`, `dist/version.json` (même valeur que `__APP_VERSION__`) et
   `dist/.vite/manifest.json` (option `build.manifest`) ;
2. `scripts/generate-sw.js`, qui écrit `dist/sw.js` à partir de `public/sw.js` en y injectant
   `BUILD_VERSION` et `PRECACHE_ASSETS`, c'est-à-dire tous les fichiers listés dans le manifeste
   Vite.

Stratégies du service worker (le seul de l'application, sans `vite-plugin-pwa`) :

| Requête | Stratégie |
| --- | --- |
| `/api/*` | Réseau uniquement. Hors ligne, il renvoie une réponse JSON 503 `OFFLINE` |
| Navigation (pages) | Réseau d'abord, avec `index.html` en cache en secours |
| `/assets/*` (fichiers hachés) | Cache d'abord. Les anciens fichiers sont gardés un temps pour les onglets restés ouverts |
| Icônes, manifest, `/` | Réseau d'abord, cache en secours |
| `/sw.js`, `/version.json` | Jamais en cache (nginx envoie aussi `no-cache`) |

Le nouveau service worker s'active immédiatement (`skipWaiting` + `clients.claim`) et supprime les
caches des builds précédents.

## 🔧 Commandes (dans `frontend/`)

```bash
pnpm run generate-icons      # icônes PNG à partir de public/icon.svg (sharp)
pnpm run validate-manifest   # vérifie que les ressources du manifest existent
pnpm run build               # dist/ + dist/sw.js
pnpm run preview             # tester le build (le service worker n'est actif que sur le build)
```

## 🚨 Dépannage

| Symptôme | Piste |
| --- | --- |
| L'application n'est pas installable | Le site doit être en HTTPS, les icônes doivent exister (`pnpm run validate-manifest`), et le navigateur doit permettre l'installation (pas Firefox sur ordinateur) |
| Ancienne version affichée | Attendre la proposition de mise à jour, ou recharger. DevTools > Application > Service Workers > « Update » |
| Une page s'affiche hors ligne mais reste vide | Normal : ses données viennent de l'API, qui n'est jamais mise en cache |
| Vérifier les caches | DevTools > Application > Cache Storage : `teachdigital-static-<build>` et `teachdigital-assets-v1` |
