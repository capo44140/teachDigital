# Implémentation de l'Endpoint PIN - Vercel Backend

## Problème Résolu

**Erreur reçue :**
```
POST https://backend-sepia-mu.vercel.app/api/profiles/1/pin 405 (Method Not Allowed)
```

L'erreur 405 (Method Not Allowed) indique que la route `/api/profiles/:id/pin` n'était pas implémentée dans le backend.

## Solution Implémentée

### Architecture

J'ai implémenté un nouveau handler `handleProfilePin` qui gère les routes imbriquées de PIN :

```
/api/profiles/:id/pin
  ├── GET   → Récupérer le statut du PIN (Admin requis)
  ├── POST  → Vérifier le PIN
  └── PUT   → Mettre à jour le PIN (Authentification requise)
```

### Détection des Routes Imbriquées

Le handler `handleProfile` a été modifié pour détecter les routes imbriquées :

```javascript
async function handleProfile(req, res) {
  const pathname = url.pathname;
  const pathParts = pathname.split('/').filter(p => p);
  
  // Déterminer si c'est une route imbriquée (ex: /api/profiles/1/pin)
  const isNestedRoute = pathParts.length > 3;
  const nestedPath = isNestedRoute ? pathParts[pathParts.length - 1] : null;
  
  // Gérer les routes imbriquées
  if (nestedPath === 'pin') {
    return await handleProfilePin(req, res, id);
  }
}
```

### Endpoints Détaillés

#### 1. GET /api/profiles/:id/pin

**Description :** Récupérer le statut du code PIN d'un profil

**Authentification :** Admin requis

**Réponse :**
```json
{
  "success": true,
  "message": "Code PIN récupéré avec succès",
  "data": {
    "profileId": 1,
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

#### 2. POST /api/profiles/:id/pin

**Description :** Vérifier si un code PIN est correct

**Body :**
```json
{
  "pin": "1234"
}
```

**Réponse (succès) :**
```json
{
  "success": true,
  "message": "Code PIN vérifié avec succès"
}
```

**Réponse (erreur) :**
```json
{
  "success": false,
  "message": "Code PIN incorrect"
}
```

#### 3. PUT /api/profiles/:id/pin

**Description :** Mettre à jour le code PIN d'un profil

**Authentification :** Requise

**Body :**
```json
{
  "newPin": "5678",
  "currentPin": "1234"  // Optionnel mais recommandé
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Code PIN mis à jour avec succès",
  "data": {
    "profileId": 1,
    "created_at": "2025-01-15T11:00:00Z"
  }
}
```

## Caractéristiques de Sécurité

✅ **Hachage du PIN** - Les PINs sont hachés avec `bcryptjs` avant stockage  
✅ **Vérification sécurisée** - Utilise `NativeHashService.verifyPin()`  
✅ **Authentification** - Les mises à jour requièrent une authentification  
✅ **Validation du PIN** - Vérification optionnelle du PIN actuel avant mise à jour  
✅ **Accès admin** - La récupération du statut est réservée aux admins

## Structure de la Table `pin_codes`

```sql
CREATE TABLE pin_codes (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  pin_code VARCHAR(255) NOT NULL,  -- Hachéé
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pin_codes_profile_id ON pin_codes(profile_id);
```

## Flux d'Utilisation Typique

### Scénario 1 : Vérifier un PIN (Connexion)

```javascript
// Client
const response = await fetch('https://api.example.com/api/profiles/1/pin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: '1234' })
});

const data = await response.json();
if (data.success) {
  // PIN correct, procéder à la connexion
}
```

### Scénario 2 : Changer un PIN

```javascript
// Client
const response = await fetch('https://api.example.com/api/profiles/1/pin', {
  method: 'PUT',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ 
    newPin: '5678',
    currentPin: '1234'  // Vérification de sécurité
  })
});
```

### Scénario 3 : Admin récupère le statut du PIN

```javascript
// Admin
const response = await fetch('https://api.example.com/api/profiles/1/pin', {
  method: 'GET',
  headers: { 
    'Authorization': 'Bearer ' + adminToken
  }
});
```

## Gestion des Erreurs

| Code | Message | Cause |
|------|---------|-------|
| 400 | Code PIN requis | PIN manquant dans le body |
| 401 | Code PIN incorrect | PIN invalide |
| 403 | Accès refusé - Admin requis | Tentative GET sans droits admin |
| 404 | Code PIN non trouvé | Aucun PIN pour ce profil |
| 405 | Méthode non autorisée | Méthode HTTP non supportée |

## Fichiers Modifiés

- `backend/api/index.js` - Ajout de `handleProfilePin` et modification de `handleProfile`

## Commits

```
36e79aa feat: ajouter endpoint POST /api/profiles/:id/pin pour gérer les codes PIN
```

## Prochaines Étapes

- [ ] Tester chaque endpoint (GET, POST, PUT)
- [ ] Vérifier la sécurité du hachage des PINs
- [ ] Monitorer les erreurs sur Vercel
- [ ] Documenter les endpoints dans Swagger/OpenAPI si applicable
