# 🗄️ Configuration Neon DB pour TeachDigital

## 📋 Prérequis

1. **Compte Neon** : Créez un compte sur [console.neon.tech](https://console.neon.tech/)
2. **Projet Neon** : Créez un nouveau projet dans votre dashboard Neon
3. **Variables d'environnement** : Configurez les variables d'environnement

## 🚀 Configuration rapide

### 1. Créer un projet Neon

1. Allez sur [console.neon.tech](https://console.neon.tech/)
2. Cliquez sur "New Project"
3. Choisissez un nom pour votre projet (ex: "teachdigital")
4. Sélectionnez une région proche de vous
5. Cliquez sur "Create Project"

### 2. Récupérer les informations de connexion

Dans votre dashboard Neon :

1. Allez dans l'onglet "Connection Details"
2. Copiez la **Connection String** (elle ressemble à : `postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`)

### 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine de votre projet :

```bash
# Copiez le contenu de env.example vers .env
cp env.example .env
```

Puis modifiez le fichier `.env` avec vos vraies informations :

```env
# Configuration Neon DB
DATABASE_URL=postgresql://votre_username:votre_password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Configuration alternative (optionnelle)
NEON_HOST=ep-xxx-xxx.us-east-1.aws.neon.tech
NEON_DATABASE=neondb
NEON_USERNAME=votre_username
NEON_PASSWORD=votre_password
NEON_PORT=5432

# Configuration de l'application
VITE_APP_NAME=TeachDigital
VITE_APP_VERSION=1.0.0
VITE_API_URL=http://localhost:3000/api
```

### 4. Initialiser la base de données

```bash
# Initialiser la base de données avec les tables et données de test
pnpm run init-db

# Ou utiliser l'alias
pnpm run db:init
```

### 5. Tester la connexion

```bash
# Tester la connexion à la base de données
pnpm run db:test
```

## 📊 Structure de la base de données

### Table `profiles`
```sql
CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('child', 'teen', 'admin')),
  is_admin BOOLEAN DEFAULT FALSE,
  is_child BOOLEAN DEFAULT FALSE,
  is_teen BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  color VARCHAR(50) DEFAULT 'purple',
  avatar_class TEXT,
  avatar_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table `pin_codes`
```sql
CREATE TABLE pin_codes (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  pin_code VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table `sessions`
```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Scripts disponibles

```bash
# Initialiser la base de données
pnpm run init-db

# Tester la connexion
pnpm run db:test

# Démarrer l'application en mode développement
pnpm run dev

# Construire l'application
pnpm run build
```

## 🛠️ Services disponibles

### ProfileService
- `getAllProfiles()` - Récupérer tous les profils
- `getProfileById(id)` - Récupérer un profil par ID
- `createProfile(data)` - Créer un nouveau profil
- `updateProfile(id, data)` - Mettre à jour un profil
- `deleteProfile(id)` - Supprimer un profil
- `toggleProfileStatus(id)` - Basculer le statut actif
- `toggleProfileLock(id)` - Basculer le verrouillage

### PinService
- `getPinByProfileId(profileId)` - Récupérer le code PIN
- `updatePin(profileId, newPin)` - Mettre à jour le code PIN
- `verifyPin(profileId, inputPin)` - Vérifier un code PIN
- `getDefaultPin()` - Récupérer le code PIN par défaut

### SessionService
- `createSession(profileId, token, expiresAt)` - Créer une session
- `verifySession(token)` - Vérifier une session
- `deleteSession(token)` - Supprimer une session
- `cleanExpiredSessions()` - Nettoyer les sessions expirées

## 🎯 Utilisation dans les composants

```javascript
import { useProfileStore } from '@/stores/profileStore.js'

export default {
  setup() {
    const profileStore = useProfileStore()
    
    // Charger tous les profils
    await profileStore.loadProfiles()
    
    // Créer un nouveau profil
    await profileStore.createProfile({
      name: 'Nouveau Profil',
      type: 'child',
      color: 'blue'
    })
    
    // Vérifier un code PIN
    const isValid = await profileStore.verifyPin(1, '1234')
    
    return {
      profiles: profileStore.profiles,
      isLoading: profileStore.isLoading
    }
  }
}
```

## 🔒 Sécurité

- **SSL obligatoire** : Toutes les connexions utilisent SSL
- **Variables d'environnement** : Les informations sensibles sont stockées dans `.env`
- **Validation** : Toutes les entrées sont validées côté serveur
- **Sessions** : Gestion sécurisée des sessions utilisateur

## 🚨 Dépannage

### Erreur de connexion
```bash
# Vérifier que le fichier .env existe et contient les bonnes informations
cat .env

# Tester la connexion
pnpm run db:test
```

### Erreur d'initialisation
```bash
# Supprimer et recréer la base de données
# (ATTENTION : cela supprimera toutes les données)
pnpm run init-db
```

### Problèmes de permissions
- Vérifiez que votre utilisateur Neon a les bonnes permissions
- Assurez-vous que la connection string est correcte

## 📞 Support

- **Documentation Neon** : [neon.tech/docs](https://neon.tech/docs)
- **Support Neon** : [neon.tech/support](https://neon.tech/support)
- **Console Neon** : [console.neon.tech](https://console.neon.tech/)

---

🎉 **Votre application TeachDigital est maintenant configurée avec Neon DB !**
