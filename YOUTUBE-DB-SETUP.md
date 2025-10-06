# 🎥 Configuration de la base de données pour les vidéos YouTube

Ce guide vous explique comment configurer votre base de données Neon pour stocker les liens YouTube.

## 📋 Prérequis

- Un compte Neon DB (gratuit) : https://console.neon.tech/
- Votre projet TeachDigital configuré

## 🔧 Configuration de Neon DB

### 1. Créer un projet Neon

1. Allez sur https://console.neon.tech/
2. Connectez-vous ou créez un compte
3. Cliquez sur "New Project"
4. Choisissez un nom pour votre projet (ex: "teachdigital")
5. Sélectionnez une région proche de vous
6. Cliquez sur "Create Project"

### 2. Obtenir les informations de connexion

Une fois votre projet créé, vous verrez :

- **Connection String** : `postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`
- **Host** : `ep-xxx-xxx.region.aws.neon.tech`
- **Database** : `neondb`
- **Username** : `username`
- **Password** : `password`

### 3. Configurer le fichier .env

Ouvrez le fichier `.env` dans votre projet et remplacez les valeurs :

```env
# Configuration Neon DB
DATABASE_URL=postgresql://votre_username:votre_password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require

# Configuration alternative (optionnelle)
NEON_HOST=ep-xxx-xxx.region.aws.neon.tech
NEON_DATABASE=neondb
NEON_USERNAME=votre_username
NEON_PASSWORD=votre_password
NEON_PORT=5432
```

## 🚀 Exécution de la migration

Une fois votre `.env` configuré, exécutez :

```bash
# Tester la connexion
node scripts/test-youtube-table.js

# Créer la table youtube_videos
node scripts/migrate-youtube-videos.js
```

## ✅ Vérification

Après la migration, vous devriez voir :

```
✅ [MIGRATION] Table youtube_videos créée avec succès
✅ [MIGRATION] Index créés avec succès
✅ [MIGRATION] Données de test insérées avec succès: 5 vidéos
```

## 🎯 Utilisation

1. **Démarrer l'application** : `npm run dev`
2. **Se connecter en tant que parent**
3. **Cliquer sur "Vidéos YouTube"** dans le panneau d'administration
4. **Ajouter vos premières vidéos** !

## 🔍 Dépannage

### Erreur de connexion
```
❌ password authentication failed for user 'username'
```
**Solution** : Vérifiez que vos informations dans `.env` sont correctes.

### Table n'existe pas
```
❌ La table youtube_videos n'existe pas
```
**Solution** : Exécutez `node scripts/migrate-youtube-videos.js`

### Variables d'environnement non chargées
```
❌ Aucune configuration de base de données valide trouvée
```
**Solution** : Vérifiez que le fichier `.env` existe et contient `DATABASE_URL`

## 📊 Structure de la table

La table `youtube_videos` contient :

- `id` : Identifiant unique
- `url` : URL complète YouTube
- `video_id` : ID de la vidéo YouTube
- `title` : Titre de la vidéo
- `description` : Description
- `category` : Catégorie (Mathématiques, Science, etc.)
- `age_group` : Groupe d'âge (3-5 ans, 6-8 ans, etc.)
- `is_active` : Statut actif/inactif
- `created_at` : Date de création
- `updated_at` : Date de modification

## 🎉 Fonctionnalités disponibles

- ✅ Ajouter des vidéos YouTube
- ✅ Organiser par catégories et groupes d'âge
- ✅ Activer/désactiver les vidéos
- ✅ Rechercher et filtrer
- ✅ Prévisualiser les vidéos
- ✅ Statistiques en temps réel
- ✅ Interface responsive et moderne

## 💡 Conseils

1. **Sécurité** : Ne partagez jamais votre fichier `.env`
2. **Sauvegarde** : Neon DB fait des sauvegardes automatiques
3. **Performance** : Les index sont créés automatiquement
4. **Évolutivité** : Neon DB peut gérer des milliers de vidéos

---

**Besoin d'aide ?** Consultez la documentation Neon : https://neon.tech/docs
