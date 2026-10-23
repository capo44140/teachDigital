# 🔒 HTTPS sur Synology (reverse proxy DSM)

Le reverse proxy intégré à DSM termine le HTTPS, puis transmet au conteneur frontend (nginx, port
3000 de l'hôte). Ce conteneur sert l'application et relaie `/api/` vers le backend par le réseau
Docker. Le backend (3001) n'est publié que sur `127.0.0.1` : le reverse proxy ne doit **jamais**
le viser directement. Architecture : [DEPLOY-SYNOLOGY.md](DEPLOY-SYNOLOGY.md).

## 1. Certificat

1. Panneau de configuration > **Sécurité** > **Certificat** > Ajouter > « Obtenir un certificat de
   Let's Encrypt ».
2. Saisir le domaine (par ex. `teachdigital.example` ou `votre-nas.synology.me`). Let's Encrypt
   exige que le domaine pointe vers l'IP publique et que le port 80 soit joignable.
3. Activer le renouvellement automatique.

## 2. Règle de reverse proxy

Panneau de configuration > **Portail des applications** > **Proxy inversé** > Créer :

| Champ | Valeur |
| --- | --- |
| Source : protocole / nom d'hôte / port | `HTTPS` / votre domaine / `443` (HSTS recommandé) |
| Destination : protocole / nom d'hôte / port | `HTTP` / `localhost` / `3000` |

Puis :

- **Certificat** : associer le certificat du domaine à cette règle (Sécurité > Certificat >
  Paramètres).
- **Délais** (Paramètres avancés) : porter les délais de connexion, d'envoi et de lecture à
  `600` s. Une génération IA peut durer jusqu'à 170 s, et une page de cours jusqu'à 9 min. nginx
  et le backend sont déjà réglés en conséquence.

Les WebSockets et les en-têtes personnalisés ne sont pas nécessaires.

## 3. Côté conteneur frontend (`.env` du dossier frontend sur le NAS)

- Avec une destination `localhost:3000` (recommandé) : `FRONTEND_BIND_ADDRESS=127.0.0.1`. Le port
  3000 n'est alors plus joignable depuis le réseau local, qui passe forcément par le HTTPS.
- Si la destination est l'IP réseau du NAS (par ex. `192.168.1.10:3000`) : mettre
  `NGINX_TRUSTED_PROXY=192.168.1.10`. Sinon nginx ignore `X-Forwarded-For` venant de cette
  adresse, et tous les clients semblent avoir la même IP, ce qui fausse le verrouillage des PIN.
  À noter : seuls `127.0.0.1` et `172.16.0.0/12` sont de confiance par défaut.

Appliquer le changement : `.\deploy.ps1 -Target frontend`, ou `docker compose up -d` dans le
dossier frontend du NAS.

## 4. Côté backend (`.env` du dossier backend sur le NAS)

```env
FRONTEND_URL=https://teachdigital.example
# Autres origines éventuelles, séparées par des virgules
ALLOWED_ORIGIN=
```

Recréer le conteneur (`.\deploy.ps1 -Target backend`, ou `docker compose up -d`).

Le build de production appelle l'API sur la même origine que la page (`/api/...`, chemins
relatifs, `frontend/src/services/apiService.js`) : le site fonctionne donc sous n'importe quel
domaine ou adresse du NAS, sans reconstruire le frontend. `VITE_API_URL_PROD` (dans
`frontend/.env`) ne sert qu'à forcer une autre origine ; la CSP de nginx (`connect-src 'self'`)
bloquerait alors les appels tant que cette origine n'y est pas ajoutée.

## 5. Vérifier

```bash
curl -I https://teachdigital.example/                 # 200, en-têtes CSP / X-Frame-Options
curl https://teachdigital.example/api/health          # {"status":"ok",...}
curl -m 5 http://<ip-du-nas>:3001/health              # depuis le réseau local : doit échouer
```

Dans le navigateur, l'application doit s'installer en PWA : le service worker exige HTTPS, sauf
sur `localhost`.

## 🐛 Dépannage

| Symptôme | Piste |
| --- | --- |
| 502 / 504 sur tout le site | Le conteneur `teachdigital-frontend` est arrêté, ou la règle ne vise pas `localhost:3000` |
| 502 sur `/api/...` seulement | Backend arrêté, ou absent du réseau `teachdigital` |
| Génération IA coupée vers 60 s | Délais du reverse proxy (étape 2) |
| Erreurs CORS | `FRONTEND_URL` doit être l'URL https exacte, sans `/` final |
| Tous les PIN se verrouillent ensemble | `NGINX_TRUSTED_PROXY` manquant (destination = IP du NAS) |
| Certificat non renouvelé | Port 80 non joignable depuis Internet ; journal dans Sécurité > Certificat |
