# Configuration des Variables d'Environnement sur Vercel

## Problème identifié
L'erreur `POST https://undefined/sql` indique que l'URL de votre base de données Neon n'est pas définie correctement sur Vercel.

## Solution : Configuration des Variables d'Environnement

### 1. Accéder au Dashboard Vercel
1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet `teachDigital`
3. Cliquez sur **Settings** dans le menu de gauche
4. Cliquez sur **Environment Variables**

### 2. Ajouter les Variables Requises

Ajoutez ces variables d'environnement :

#### Variable Principale (Recommandée)
```
Nom: DATABASE_URL
Valeur: postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
Environnements: Production, Preview, Development
```

#### Variables Alternatives (si vous préférez des variables séparées)
```
Nom: VITE_DATABASE_URL
Valeur: postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
Environnements: Production, Preview, Development

Nom: VITE_NEON_HOST
Valeur: ep-xxx-xxx.us-east-1.aws.neon.tech
Environnements: Production, Preview, Development

Nom: VITE_NEON_DATABASE
Valeur: neondb
Environnements: Production, Preview, Development

Nom: VITE_NEON_USERNAME
Valeur: votre_username_neon
Environnements: Production, Preview, Development

Nom: VITE_NEON_PASSWORD
Valeur: votre_password_neon
Environnements: Production, Preview, Development
```

### 3. Obtenir vos Informations Neon

1. Allez sur https://console.neon.tech/
2. Connectez-vous à votre compte
3. Sélectionnez votre projet
4. Allez dans **Dashboard** > **Connection Details**
5. Copiez l'**Connection String** complète

### 4. Redéployer

Après avoir ajouté les variables :
1. Allez dans **Deployments** dans Vercel
2. Cliquez sur **Redeploy** sur le dernier déploiement
3. Ou faites un nouveau push sur votre branche main

### 5. Vérifier les Logs

1. Allez dans **Functions** > **View Function Logs**
2. Recherchez les messages de debug que nous avons ajoutés :
   - `🔍 Variables d'environnement détectées:`
   - `✅ Connexion à Neon DB configurée avec succès`

## Variables d'Environnement Recommandées

Pour une configuration complète, ajoutez aussi :

```
VITE_APP_NAME=TeachDigital
VITE_APP_VERSION=1.0.0
```

## Test de Connexion

Une fois configuré, vous devriez voir dans les logs :
- ✅ Variables d'environnement détectées
- ✅ Connexion à Neon DB configurée avec succès
- ✅ Connexion à la base de données testée avec succès

## Dépannage

Si le problème persiste :
1. Vérifiez que l'URL de connexion Neon est correcte
2. Vérifiez que votre base de données Neon est active
3. Vérifiez les logs Vercel pour plus de détails
4. Testez la connexion localement avec les mêmes variables
