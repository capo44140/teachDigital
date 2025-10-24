# Flux de Connexion avec Code PIN - TeachDigital

## Vue d'Ensemble

Le flux de connexion avec code PIN comprend :
1. **Saisie du PIN** - L'utilisateur entre un code PIN à 4 chiffres
2. **Vérification** - L'API backend vérifie le PIN
3. **Session** - Une session est créée
4. **Redirection** - Redirection vers le dashboard

## Architecture

```
┌─────────────────┐
│  Frontend Vue   │
│  (PinLock.vue)  │
└────────┬────────┘
         │
         │ 1. Saisie PIN
         │
    ┌────▼─────────────────────┐
    │ profileStore.verifyPin() │
    └────┬─────────────────────┘
         │
         │ 2. POST /api/profiles/:id/pin
         │
    ┌────▼─────────────────────────┐
    │ ApiService.request()          │
    │ (appelle le backend)          │
    └────┬─────────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  Backend Vercel Functions  │
    │  (handleProfilePin)        │
    │                            │
    │  1. Récupère le PIN haché  │
    │  2. Vérifie avec bcryptjs  │
    │  3. Retourne success/error │
    └────┬──────────────────────┘
         │
         │ 3. Réponse { success: true }
         │
    ┌────▼──────────────────────┐
    │ Frontend crée session      │
    │ sessionService.createSession
    └────┬──────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ Redirection vers /dashboard   │
    │ this.$router.push('/dashboard')
    └──────────────────────────────┘
```

## Composants Impliqués

### 1. Frontend - PinLock.vue

```javascript
async checkPin() {
  const enteredPin = this.pinDigits.join('')  // Ex: "1234"
  
  // Appeler le store pour vérifier le PIN
  const isValid = await this.profileStore.verifyPin(profileId, enteredPin)
  
  if (isValid) {
    // ✅ PIN correct - créer une session
    sessionService.createSession(profileId, this.profileName)
    
    // Sauvegarder le profil
    localStorage.setItem('selectedProfile', JSON.stringify({ id: profileId, name: this.profileName }))
    
    // Redirection vers le dashboard
    this.$router.push({ 
      path: '/dashboard', 
      query: { profile: profileId, unlocked: 'true' }
    })
  } else {
    // ❌ PIN incorrect - afficher erreur
    this.attempts++
    this.errorMessage = `Code PIN incorrect. Tentatives: ${remainingAttempts}`
  }
}
```

### 2. Frontend - Profile Store

```javascript
// src/stores/profileStore.js
async verifyPin(profileId, pin) {
  // Appelle PinService qui utilise l'API
  const isValid = await PinService.verifyPin(profileId, pin)
  return isValid
}
```

### 3. Frontend - PIN Service (Modifié)

```javascript
// src/services/profile/pinService.js
static async verifyPin(profileId, inputPin) {
  // ✅ Utilise l'API backend (pas d'accès direct à la BD)
  const response = await ApiService.request(
    `/api/profiles/${profileId}/pin`,
    { method: 'POST', body: JSON.stringify({ pin: inputPin }) }
  )
  
  return response.success // true ou false
}
```

### 4. Backend - API Endpoint

```javascript
// backend/api/index.js - handleProfilePin()
async function handleProfilePin(req, res, profileId) {
  if (req.method === 'POST') {
    const { pin } = req.body
    
    // 1. Récupérer le PIN haché du profil
    const existingPin = await sql`
      SELECT pin_code FROM pin_codes 
      WHERE profile_id = ${profileId} 
      ORDER BY created_at DESC LIMIT 1
    `
    
    // 2. Vérifier le PIN avec bcryptjs
    const isValidPin = await NativeHashService.verifyPin(
      pin, 
      existingPin[0].pin_code
    )
    
    if (isValidPin) {
      // ✅ PIN correct
      res.status(200).json({
        success: true,
        message: 'Code PIN vérifié avec succès'
      })
    } else {
      // ❌ PIN incorrect
      res.status(401).json({
        success: false,
        message: 'Code PIN incorrect'
      })
    }
  }
}
```

## Flux Détaillé

### Étape 1 : Utilisateur Saisit le PIN

```
Frontend: L'utilisateur tape "1234" dans le clavier numérique
         → 4 chiffres saisis automatiquement
         → checkPin() est appelé automatiquement
```

### Étape 2 : Vérification via API

```
Request:
POST /api/profiles/1/pin HTTP/1.1
Host: backend-sepia-mu.vercel.app
Content-Type: application/json

{
  "pin": "1234"
}

Response (Succès):
HTTP/1.1 200 OK
{
  "success": true,
  "message": "Code PIN vérifié avec succès"
}

Response (Erreur):
HTTP/1.1 401 Unauthorized
{
  "success": false,
  "message": "Code PIN incorrect"
}
```

### Étape 3 : Création de Session

```javascript
// Session créée côté frontend
sessionService.createSession(profileId, profileName)

// Stockage dans localStorage
localStorage.setItem('selectedProfile', JSON.stringify({
  id: 1,
  name: 'Parent'
}))
```

### Étape 4 : Redirection vers Dashboard

```javascript
// Navigation Vue Router
this.$router.push({
  path: '/dashboard',
  query: { 
    profile: '1',
    unlocked: 'true'
  }
})

// URL finale :
// http://localhost:5173/dashboard?profile=1&unlocked=true
```

## Sécurité

### ✅ Backend
- Hachage bcryptjs des PINs en base de données
- Pas de PIN en clair stocké
- Vérification côté serveur uniquement
- Tentatives limitées (MAX_ATTEMPTS)

### ✅ Frontend
- Pas d'accès direct à la base de données
- Tous les appels via l'API backend
- Utilisation de ApiService pour les requêtes
- Session créée après vérification réussie

### ✅ Transport
- HTTPS en production
- Token JWT dans les headers si authentification requise
- Validation CORS

## Correction Effectuée

### Avant (Problématique)
```javascript
// ❌ Le frontend accédait directement à la BD
import sql from '../../config/database.js'

static async verifyPin(profileId, inputPin) {
  const pinRecord = await sql` SELECT ... FROM pin_codes` // ❌ Erreur !
  // ...
}
```

**Problèmes :**
- ❌ Accès direct à la base de données du frontend
- ❌ Violation de la sécurité
- ❌ Système de protection désactivé
- ❌ Redirection ne fonctionnait pas

### Après (Correct)
```javascript
// ✅ Le frontend utilise l'API backend
import ApiService from '../apiService.js'

static async verifyPin(profileId, inputPin) {
  const response = await ApiService.request(
    `/api/profiles/${profileId}/pin`,
    { method: 'POST', body: JSON.stringify({ pin: inputPin }) }
  )
  return response.success
}
```

**Améliorations :**
- ✅ Utilise l'API backend
- ✅ Respecte l'architecture de sécurité
- ✅ Redirection fonctionne correctement
- ✅ Gestion centralisée des erreurs

## Testez le Flux

### Test 1 : Connexion Réussie

```bash
# 1. Allez sur la page de connexion
http://localhost:5173/pin-lock

# 2. Entrez le PIN par défaut
1234

# 3. Vous devriez être redirigé vers
http://localhost:5173/dashboard?profile=1&unlocked=true
```

### Test 2 : Connexion Échouée

```bash
# 1. Entrez un PIN incorrect
9999

# 2. Message d'erreur affiché
"Code PIN incorrect. Tentatives: 2"

# 3. Après 3 tentatives, redirection vers la page d'accueil
http://localhost:5173/
```

## Variables d'Environnement Nécessaires

```bash
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key

# Frontend (vite.config.js)
VITE_API_URL=https://backend-sepia-mu.vercel.app
```

## Dépannage

### Le PIN ne se valide pas
- ✅ Vérifier que le backend est en ligne
- ✅ Vérifier que `/api/profiles/:id/pin` POST existe
- ✅ Checker les logs du backend
- ✅ Vérifier que le PIN par défaut est initialisé (1234)

### La redirection ne fonctionne pas
- ✅ Vérifier que Vue Router est configuré
- ✅ Vérifier que `/dashboard` existe
- ✅ Checker les erreurs de console

### Session non créée
- ✅ Vérifier que `sessionService.createSession()` est appelé
- ✅ Vérifier que localStorage fonctionne
- ✅ Checker les permissions du navigateur

## Fichiers Modifiés

- `src/services/profile/pinService.js` - Utiliser l'API backend
- `backend/api/index.js` - Endpoint PIN (déjà implémenté)

## Commits

```
1001848 fix: utiliser l'API backend pour la vérification du PIN au lieu d'accéder directement à la BD
```

## Résultat

Après cette correction :
- ✅ Quand le PIN est correct → Redirection vers /dashboard
- ✅ Quand le PIN est incorrect → Message d'erreur
- ✅ Architecture respecte la sécurité
- ✅ Flux de connexion fonctionnnel
