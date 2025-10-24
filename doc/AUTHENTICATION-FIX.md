# Correction du Problème d'Authentification 401

## 📌 Problème Identifié

L'application recevait une erreur **401 (Unauthorized)** sur la route `GET /api/profiles` lors du chargement initial de la liste des profils.

### Cause Racine

L'endpoint `/api/profiles` en GET requérait une authentification JWT valide, mais cette requête est faite avant que l'utilisateur ne se connecte. C'était un paradoxe logique : il faut voir les profils pour se connecter, mais l'API demandait l'authentification avant de montrer les profils.

## ✅ Solutions Apportées

### 1. Backend : Endpoint Publique pour GET /api/profiles

**Fichier modifié** : `backend/api/index.js`

#### Avant
```javascript
async function handleProfiles(req, res) {
  try {
    const user = authenticateToken(req); // ❌ Authentification requise pour tout
    
    if (req.method === 'GET') {
      // Récupérer les profils
    } else if (req.method === 'POST') {
      // Créer un profil
    }
  }
}
```

#### Après
```javascript
async function handleProfiles(req, res) {
  try {
    if (req.method === 'GET') {
      // ✅ GET est PUBLIC - pas d'authentification requise
      const profiles = await sql`SELECT ... FROM profiles ...`;
      
    } else if (req.method === 'POST') {
      // ✅ POST requiert l'authentification ET les droits admin
      const user = authenticateToken(req);
      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Admin requis' });
      }
      // Créer un profil
    }
  }
}
```

### 2. Frontend : Gestion Dynamique du Token

**Fichier modifié** : `src/services/apiService.js`

#### Avant
```javascript
class ApiService {
  constructor() {
    this.baseURL = '...';
    this.token = localStorage.getItem('auth_token'); // ❌ Chargé une seule fois
  }
  
  async request(endpoint, options = {}) {
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }
  }
}
```

#### Après
```javascript
class ApiService {
  constructor() {
    this.baseURL = '...';
    // ✅ Plus de stockage du token dans une propriété
  }
  
  getToken() {
    // ✅ Récupérer le token dynamiquement à chaque requête
    return localStorage.getItem('auth_token');
  }
  
  async request(endpoint, options = {}) {
    const token = this.getToken(); // ✅ Fraîche récupération
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
}
```

## 🔐 Flow d'Authentification Corrigé

```
┌─────────────────────────────────────────────────┐
│ 1. APPLICATION DÉMARRE                          │
│    └─ Pas de token en localStorage              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ 2. ProfileSelector.vue Monte                    │
│    └─ Appelle loadProfiles()                    │
│       └─ GET /api/profiles                      │
│          └─ RÉPONSE: 200 OK ✅ (public)         │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ 3. User Sélectionne Profil Admin                │
│    └─ Redirection vers /pin-lock                │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ 4. PinLock: User Entre le PIN                   │
│    └─ POST /api/auth/login                      │
│       { profileId, pin }                        │
│       └─ RÉPONSE: { token: "jwt..." }           │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ 5. Token Stocké en localStorage                 │
│    └─ apiService.getToken() le récupère        │
│       à chaque requête suivante                 │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ 6. Toutes Requêtes Authentifiées                │
│    └─ GET /api/lessons                          │
│       Header: Authorization: Bearer {token}     │
│       └─ RÉPONSE: 200 OK ✅                     │
└─────────────────────────────────────────────────┘
```

## 🧪 Testing des Corrections

### Test 1 : Récupérer les profils (sans authentification)
```bash
curl -X GET https://backend-sepia-mu.vercel.app/api/profiles
# Résultat attendu: 200 OK
# {
#   "success": true,
#   "data": { "profiles": [...] }
# }
```

### Test 2 : Créer un profil (sans authentification)
```bash
curl -X POST https://backend-sepia-mu.vercel.app/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"admin"}'
# Résultat attendu: 401 Unauthorized
# { "success": false, "message": "Token manquant" }
```

### Test 3 : Créer un profil (avec authentification)
```bash
curl -X POST https://backend-sepia-mu.vercel.app/api/profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"name":"Test","type":"admin"}'
# Résultat attendu: 201 Created
# { "success": true, "data": { "profile": {...} } }
```

## 📋 Endpoints Public vs Protégés

### 🔓 Endpoints Publics (avant connexion)
- **GET** `/api/profiles` - Récupérer la liste des profils
- **POST** `/api/auth/login` - Connexion avec profil + PIN

### 🔐 Endpoints Protégés (après connexion)
- **POST** `/api/profiles` - Créer un profil (admin only)
- **PUT** `/api/profiles/{id}` - Modifier un profil (admin only)
- **DELETE** `/api/profiles/{id}` - Supprimer un profil (admin only)
- **GET** `/api/profiles/{id}` - Récupérer un profil spécifique
- **GET** `/api/lessons` - Récupérer les leçons
- **POST** `/api/lessons` - Créer une leçon (admin only)
- Etc...

## 🚀 Déploiement

Après ces changements, assurez-vous de redéployer sur Vercel :

```bash
# Depuis le dossier racine
pnpm run build
# Puis pousser sur git - Vercel redéploiera automatiquement
git add .
git commit -m "fix: rendre GET /api/profiles public et améliorer gestion du token"
git push origin main
```

## 📝 Notes Importantes

1. **Sécurité** : L'endpoint public `/api/profiles` n'expose que les données publiques des profils (pas de données sensibles).
2. **Token** : Utilisé uniquement quand disponible. Les requêtes sans token sont rejetées correctement.
3. **Erreur 401** : Déclenche automatiquement une déconnexion (`logout()`) pour forcer une nouvelle connexion.

## 🔗 Fichiers Modifiés

- `backend/api/index.js` - Modification du handler `handleProfiles()`
- `src/services/apiService.js` - Gestion dynamique du token
