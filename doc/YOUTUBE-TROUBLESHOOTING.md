# 🔧 Dépannage - Gestionnaire de vidéos YouTube

Ce guide vous aide à résoudre les problèmes courants avec le gestionnaire de vidéos YouTube.

## ❌ Erreurs courantes

### 1. "URL YouTube invalide"

**Symptôme :**
```
❌ [YOUTUBE_SERVICE] Erreur dans createVideo: Error: URL YouTube invalide
```

**Causes possibles :**
- URL YouTube mal formatée
- URL non-YouTube (ex: Google, Facebook, etc.)
- URL YouTube incomplète

**Solutions :**

#### ✅ URLs YouTube valides :
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
https://www.youtube.com/v/VIDEO_ID
```

#### ❌ URLs invalides :
```
https://www.google.com
https://www.youtube.com/watch
https://www.youtube.com/watch?v=
not-a-url
```

**Test de votre URL :**
```bash
node scripts/test-youtube-extraction-simple.js
```

### 2. "Veuillez remplir tous les champs obligatoires"

**Symptôme :**
```
❌ Veuillez remplir tous les champs obligatoires
```

**Solution :**
- Vérifiez que le champ "URL YouTube" est rempli
- Vérifiez que le champ "Titre" est rempli  
- Vérifiez que le champ "Catégorie" est sélectionné

### 3. Erreur de base de données

**Symptôme :**
```
❌ password authentication failed for user 'username'
```

**Solution :**
1. Vérifiez votre fichier `.env` :
```env
DATABASE_URL=postgresql://votre_username:votre_password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

2. Testez la connexion :
```bash
node scripts/test-youtube-table.js
```

3. Créez la table si nécessaire :
```bash
node scripts/migrate-youtube-videos.js
```

### 4. Table n'existe pas

**Symptôme :**
```
❌ La table youtube_videos n'existe pas
```

**Solution :**
```bash
# Créer la table
node scripts/migrate-youtube-videos.js

# Vérifier que la table existe
node scripts/test-youtube-table.js
```

### 5. Données de démonstration

**Symptôme :**
```
⚠️ [YOUTUBE_SERVICE] Erreur DB, utilisation des données de démonstration
```

**Explication :**
L'application utilise des données de démonstration quand la base de données n'est pas configurée.

**Solution :**
Configurez votre base de données Neon (voir `YOUTUBE-DB-SETUP.md`)

## 🔍 Validation en temps réel

L'interface valide automatiquement les URLs YouTube :

- ✅ **URL valide** : Bordure verte + message "URL YouTube valide"
- ❌ **URL invalide** : Bordure rouge + message d'erreur
- ⚪ **URL vide** : Bordure normale

## 🧪 Tests disponibles

### Test d'extraction d'ID YouTube
```bash
node scripts/test-youtube-extraction-simple.js
```

### Test de connexion base de données
```bash
node scripts/test-youtube-table.js
```

### Test de migration
```bash
node scripts/migrate-youtube-videos.js
```

## 📋 Checklist de dépannage

- [ ] Fichier `.env` configuré avec `DATABASE_URL`
- [ ] Base de données Neon accessible
- [ ] Table `youtube_videos` créée
- [ ] URL YouTube au format correct
- [ ] Tous les champs obligatoires remplis
- [ ] Application en mode développement (`npm run dev`)

## 🆘 Support

Si le problème persiste :

1. **Vérifiez les logs** dans la console du navigateur
2. **Testez la connexion** : `npm run db:test`
3. **Vérifiez la configuration** : `node scripts/test-youtube-table.js`
4. **Consultez la documentation** : `YOUTUBE-DB-SETUP.md`

## 💡 Conseils

### URLs YouTube recommandées
```
✅ https://www.youtube.com/watch?v=dQw4w9WgXcQ
✅ https://youtu.be/dQw4w9WgXcQ
✅ https://www.youtube.com/embed/dQw4w9WgXcQ
```

### Formats à éviter
```
❌ https://www.youtube.com/watch (sans ID)
❌ https://www.google.com (pas YouTube)
❌ URL raccourcie sans ID visible
```

### Configuration base de données
```env
# Format correct
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Variables individuelles (alternative)
NEON_HOST=ep-xxx-xxx.region.aws.neon.tech
NEON_DATABASE=neondb
NEON_USERNAME=username
NEON_PASSWORD=password
```

---

**Besoin d'aide ?** Consultez la documentation Neon : https://neon.tech/docs
