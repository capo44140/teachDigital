# 🔐 Authentification : code familial, codes PIN et jetons

Ce document décrit l'accès à TeachDigital tel qu'il est implémenté. Côté backend :
`backend/lib/auth.js`, `lib/bruteForce.js`, `lib/pinAttempts.js`, `lib/pinPolicy.js` et
`controllers/authController.js`. Côté frontend : `src/services/authService.js`,
`familyGateService.js`, `sessionService.js`, `parentAccessService.js` et `src/router/index.js`.

## 1. Parcours

```text
/family-gate ── POST /api/auth/family-gate { pin } ──▶ jeton « famille » (24 h)
     │
     ▼
/ (choix du profil)
     ├─ profil enfant / ado ──▶ /user-dashboard?profile=<id>   (jeton famille, sans PIN)
     └─ profil parent ──▶ /pin-lock ── POST /api/auth/login { profileId, pin } ──▶ jeton « profil » (4 h)
                                         (exige le jeton famille dans Authorization)
                                         ──▶ /dashboard  (session parent : 15 min sans activité)
```

1. **Code d'entrée familial** (`POST /api/auth/family-gate`, public, limité par IP). Il délivre un
   jeton JWT de scope `family`. Ce jeton donne l'accès « enfant » à l'API : uniquement les profils
   **actifs et non parents**, jamais les données d'un parent. Sans code configuré, le serveur
   répond 503 `FAMILY_GATE_NOT_CONFIGURED` et personne ne peut se connecter.
2. **Connexion à un profil par PIN** (`POST /api/auth/login`). Elle exige un jeton famille (ou
   profil) valide : le code familial passe toujours en premier. Elle délivre un jeton de scope
   `profile`.
3. **Espace parent**. Le guard du router exige à la fois une session parent déverrouillée
   (`sessionService`) et un jeton profil administrateur **du même profil**
   (`hasParentAccess`). Les paramètres `?profile=` et `?unlocked=true` ne donnent aucun droit.
   L'espace parent se verrouille (session et jeton parent supprimés) :
   - après **15 min sans activité** (toucher, clavier), même sans navigation (`useParentIdleLock`) ;
   - dès le **retour au choix du profil** (`/`) : la tablette peut passer à un enfant, le PIN
     sera redemandé.
   Côté serveur, `requireAdmin` revérifie en base que le profil est actif et administrateur.
4. **Jetons utilisés par le client** (`apiService`) : le jeton profil d'abord, à défaut le jeton
   famille. Sur un 401, le client renvoie au code familial (jeton famille refusé) ou au PIN
   (espace parent).

Autres routes : `GET /api/auth/verify` (validité du jeton au démarrage) et `POST /api/auth/logout`.
Les jetons sont sans état : la déconnexion supprime le jeton côté client.

## 2. Révocation des jetons (`token_version`)

Chaque jeton porte une version (`tokenVersion`), comparée à chaque requête avec
`profiles.token_version` (jeton profil) ou `family_gate.token_version` (jeton famille). La version
est incrémentée, ce qui invalide tous les jetons déjà émis, dans les cas suivants :

| Événement | Jetons révoqués |
| --- | --- |
| Changement du code familial (`PUT /api/auth/family-gate`, `init-family-gate.js`) | tous les jetons famille. La réponse fournit un nouveau jeton à l'appareil du parent |
| Changement de PIN (`PUT /api/profiles/:id/pin`, `reset-pin.js`) | jetons du profil. Le parent qui change son propre PIN reçoit un nouveau jeton |
| Désactivation ou changement de type d'un profil | jetons du profil |

Le serveur garde ces versions en cache 30 s (`AUTH_CACHE_TTL_MS`). Les changements faits par
l'API vident le cache aussitôt ; ceux faits directement en base ou par script sont pris en compte
au plus tard 30 s après. Un jeton émis avant la migration `0100_token_version` vaut la version 0.

## 3. Verrouillage après des codes incorrects

Les compteurs sont partagés par `POST /api/auth/login` et `POST /api/profiles/:id/pin`, ainsi que
par la vérification du PIN actuel lors d'un changement. Le code familial a ses propres compteurs,
selon les mêmes règles.

- **Par (profil, adresse IP)** : 10 échecs en 15 min verrouillent l'accès pendant **15 min**, puis
  **1 h**, puis **24 h** si les verrouillages se répètent. Un succès remet le compteur à zéro, et
  l'escalade est oubliée 24 h après le dernier verrouillage. Un enfant qui tape au hasard sur la
  tablette ne bloque ainsi que sa propre adresse.
- **Plafond global par profil** (toutes IP confondues) : 100 échecs en 1 h verrouillent pendant
  15 min, **sans escalade**, pour qu'il ne devienne pas un moyen de bloquer la famille.
- Réponse : HTTP 429 avec le code `PIN_LOCKED` (ou `FAMILY_GATE_LOCKED`), l'en-tête `Retry-After`
  et `retryAfterSeconds`. L'écran PIN affiche un compte à rebours.
- Chaque verrouillage est journalisé (`PIN_LOCKED`). Quand il s'agit d'un **PIN parent**, une
  notification `security_alert` est aussi créée pour les parents, dans la table `notifications`.
  Elle s'affiche dans le centre de notifications du tableau de bord parent (cloche de l'en-tête).
- Les compteurs sont **en mémoire** : un redémarrage du backend lève tous les verrouillages
  (`docker restart teachdigital-backend`).
- S'y ajoutent des limites de débit par IP : `API_RATE_LIMIT_LOGIN_*`, `API_RATE_LIMIT_PIN_*` et
  `API_RATE_LIMIT_FAMILY_GATE_*` (voir [SYNOLOGY-ENV-VARIABLES.md](SYNOLOGY-ENV-VARIABLES.md)).

L'IP prise en compte est celle que transmet le nginx du frontend. Pour le réglage du proxy de
confiance, voir [HTTPS-SYNOLOGY-SETUP.md](HTTPS-SYNOLOGY-SETUP.md).

## 4. Politique des codes

Elle est appliquée **uniquement lors d'un changement** de code : `PUT /api/profiles/:id/pin`,
`PUT /api/auth/family-gate` et les scripts d'initialisation. Les codes existants continuent de
fonctionner à la connexion, même s'ils ne respectent plus la politique.

| Règle | Code d'erreur (400) |
| --- | --- |
| 4 à 8 chiffres | `INVALID_PIN` |
| Profil parent : au moins **6 chiffres** | `PIN_TOO_SHORT` |
| Pas de code trivial : suite (`1234`, `9876`), répétition (`0000`, `1212`, `123123`) ou code courant (`2580`, `1004`…) | `WEAK_PIN` |

Pour modifier son propre PIN, le PIN actuel est demandé (`CURRENT_PIN_REQUIRED`). Un parent peut
réinitialiser le PIN d'un autre profil sans le connaître. Pour le code familial, le code actuel
est demandé dès qu'un code existe. Le frontend applique les mêmes règles avant l'envoi
(`src/utils/pinPolicy.js`), mais c'est le serveur qui fait foi.

## 5. Stockage

- PIN et code familial sont hachés avec **bcrypt** (coût 10, `lib/nativeHash.js`). Les anciens
  hachages `$native$` (SHA-256 salé) sont encore acceptés, puis rehachés en bcrypt à la première
  connexion réussie.
- Un seul PIN par profil : contrainte unique sur `pin_codes.profile_id` (migration 0101).
- Le hachage n'est jamais renvoyé par l'API.

## 6. Journal d'audit

Le serveur journalise lui-même les événements sensibles dans `audit_logs` (`lib/auditLog.js`) :
`LOGIN_SUCCESS`, `LOGIN_FAILED`, `FAMILY_GATE_SUCCESS`, `FAMILY_GATE_FAILED`,
`FAMILY_GATE_LOCKED`, `FAMILY_GATE_CHANGED`, `PIN_LOCKED` et `PIN_CHANGED`. Les journaux envoyés
par le client (`POST /api/audit/logs`) exigent un jeton et sont limités par IP et globalement.
L'utilisateur est déduit du jeton, et l'IP et le user-agent sont fixés par le serveur. Seuls les
parents peuvent lire, compter et exporter le journal (écran « Sécurité », `/security-dashboard`).

## 7. Scripts d'administration (dans `backend/`, ou `docker exec -it teachdigital-backend ...`)

| Commande | Rôle |
| --- | --- |
| `node scripts/init-family-gate.js <code>` | Définit ou remplace le code familial et révoque les jetons famille |
| `node scripts/init-default-pins.js <PIN>` | Donne ce PIN aux profils qui n'en ont pas (6 chiffres minimum si l'un d'eux est parent) |
| `node scripts/reset-pin.js <id profil> <PIN>` | Réinitialise un PIN oublié et révoque les sessions du profil |

Après `reset-pin.js`, si la connexion reste bloquée par un verrouillage, redémarrer le conteneur.
