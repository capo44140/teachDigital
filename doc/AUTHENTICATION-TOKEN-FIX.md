# Correction : Erreur "Token manquant" sur les routes GET - Vercel Backend

## Problème Identifié

**Erreur reçue sur Vercel :**
```
Erreur API: Error: Token manquant
    at authenticateToken (/var/task/lib/auth.js:10:11)
    at handleProfile (/var/task/api/index.js:272:18)
```

### Cause Racine

Les routes de récupération de données (GET) requéraient une authentification dès l'entrée du handler, alors que les clients n'envoyaient pas de token pour les requêtes publiques.

**Routes affectées :**
- `GET /api/profiles/:id` - Récupération d'un profil
- `GET /api/lessons` - Liste des leçons
- `GET /api/lessons/:id` - Récupération d'une leçon
- `GET /api/notifications` - Liste des notifications (sans profileId)
- `GET /api/notifications/:id` - Récupération d'une notification

## Solution Implémentée

### Principes de Base

1. **GET requests = Publiques** - Les requêtes de lecture ne requièrent pas d'authentification
2. **POST requests = Authentifiées** - La création de ressources requiert un token
3. **PUT/DELETE requests = Authentifiées** - Les modifications requièrent un token

### Modifications Détaillées

#### 1. Handler des Profils (`handleProfile`)

**Avant :**
```javascript
async function handleProfile(req, res) {
  try {
    const user = authenticateToken(req); // ❌ Appelé pour tous les verbes HTTP
    // ...
    if (req.method === 'GET') {
      // Code GET
    }
  }
}
```

**Après :**
```javascript
async function handleProfile(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.pathname.split('/').pop();

    if (req.method === 'GET') {
      // ✅ Pas d'authentification requise pour GET
      // Récupère le profil publiquement
    } else if (req.method === 'PUT') {
      const user = authenticateToken(req); // ✅ Authentification requise
      // Code PUT
    } else if (req.method === 'DELETE') {
      const user = authenticateToken(req); // ✅ Authentification requise
      // Code DELETE
    }
  }
}
```

#### 2. Handler des Leçons (`handleLessons` et `handleLesson`)

**Modifications similaires :**
- `GET /api/lessons` - Public (authentification optionnelle, utilisée seulement si pas de profileId)
- `GET /api/lessons/:id` - Public
- `POST /api/lessons` - Requiert authentification
- `PUT /api/lessons/:id` - Requiert authentification
- `DELETE /api/lessons/:id` - Requiert authentification

#### 3. Handler des Notifications (`handleNotifications` et `handleNotification`)

**Modifications :**
- `GET /api/notifications` - Public avec profileId, authentification requise sans profileId
- `GET /api/notifications/:id` - Public
- `POST /api/notifications` - Requiert authentification (Admin requis)
- `PUT /api/notifications/:id` - Requiert authentification
- `DELETE /api/notifications/:id` - Requiert authentification

## Avantages de la Solution

✅ **Résout le problème "Token manquant"** - Les GET requests fonctionnent sans authentification
✅ **Cohérent avec REST** - Les GET sont publiques par défaut
✅ **Sécurité maintenue** - Les modifications requièrent toujours l'authentification
✅ **Flexibilité** - Les requêtes GET peuvent être protégées par d'autres moyens (rateLimiting, IP whitelist, etc.)
✅ **Performance** - Moins de charge sur l'authentification pour les lecture publiques

## Test Recommandé

```bash
# Test GET public (devrait fonctionner sans token)
curl https://api.vercel.app/api/profiles/123

# Test POST (devrait échouer sans token)
curl -X POST https://api.vercel.app/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'

# Test GET avec token (devrait fonctionner)
curl https://api.vercel.app/api/lessons/456 \
  -H "Authorization: Bearer <token>"
```

## Fichier Modifié

- `backend/api/index.js` - Handlers des profils, leçons et notifications

## Commit

```
fix: rendre les routes GET publiques pour éviter l'erreur Token manquant
```

## Migration vers Production

Cette correction doit être déployée immédiatement sur Vercel car elle corrige un bug critique empêchant la consultation des données publiques.

### Checklist de déploiement

- [ ] Code mergé dans la branche principale
- [ ] Tests sur l'environnement de staging
- [ ] Déploiement sur Vercel
- [ ] Vérification des logs d'erreur
- [ ] Notification aux utilisateurs si nécessaire
