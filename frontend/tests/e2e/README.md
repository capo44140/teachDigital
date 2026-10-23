# Tests E2E (Playwright)

Parcours critiques de l'application, exécutés sur le serveur de développement Vite
(`webServer` de `playwright.config.js`). L'API est entièrement simulée par `page.route('**/api/**')`
(`support/api.js`) : ni backend ni base de données. Les sélecteurs passent par les rôles et
libellés accessibles (`getByRole`, `getByLabel`), pas par des `data-testid`.

| Fichier | Parcours |
| --- | --- |
| `family-gate.spec.js` | code familial → choix du profil → tableau de bord enfant (présentation guidée), code incorrect |
| `child-quiz.spec.js` | quiz d'une leçon : seules les réponses partent, score et correction renvoyés par le serveur ; échec puis nouvel essai d'enregistrement |
| `parent-pin.spec.js` | PIN parent (4 à 8 chiffres, Entrée ou « Valider ») → tableau de bord parent ; PIN incorrect (message du serveur) ; 429 `PIN_LOCKED` (compte à rebours) |
| `parent-notifications.spec.js` | centre de notifications du parent : compteur de la cloche, panneau, « Marquer comme lue », suppression confirmée, « Tout marquer comme lu », erreur puis « Réessayer » |
| `app-shell.spec.js` | page 404 ; bandeau hors ligne (`context.setOffline`) |
| `course-page.spec.js` | page de cours : URL signée (`POST /api/course-pages/:id/view`) affichée dans une iframe isolée |

Projets : `chromium` (bureau) et `mobile` (Pixel 5), tous deux sur Chromium.

```bash
pnpm exec playwright install chromium   # une fois (CI : --with-deps chromium)
pnpm exec playwright test

# Sans navigateur Playwright installé : navigateur du système (vidéos désactivées)
E2E_BROWSER_CHANNEL=msedge pnpm exec playwright test      # PowerShell : $env:E2E_BROWSER_CHANNEL='msedge'
```

`E2E_PORT` change le port du serveur de test (5173 par défaut) ; un serveur déjà lancé sur ce port
est réutilisé hors CI.
