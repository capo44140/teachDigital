# 📦 Gestion Automatique des Versions

Ce projet inclut un système d'incrémentation automatique des versions à chaque commit/push.

## 🚀 Configuration Initiale

Pour configurer le système de version automatique, exécutez :

```bash
npm run setup:hooks
```

Cette commande va :
- Configurer les hooks Git automatiques
- Créer le fichier `src/version.json`
- Ajouter les scripts de version au `package.json`

## 📋 Commandes Disponibles

### Incrémentation Manuelle
```bash
# Incrémenter la version patch (0.0.0 -> 0.0.1)
npm run version:patch

# Incrémenter la version minor (0.0.0 -> 0.1.0)
npm run version:minor

# Incrémenter la version major (0.0.0 -> 1.0.0)
npm run version:major

# Afficher la version actuelle
npm run version:current
```

### Incrémentation Automatique
L'incrémentation automatique se fait :
- **À chaque commit** sur la branche `main` ou `master`
- **Seulement si** aucun fichier de version n'a été modifié manuellement
- **Type par défaut** : `patch` (0.0.1)

## 🔄 Fonctionnement Automatique

### Hook Pre-commit
Le hook `pre-commit` s'exécute automatiquement avant chaque commit et :
1. Vérifie si des fichiers de version sont déjà modifiés
2. Si non, incrémente automatiquement la version patch
3. Met à jour `package.json`, `public/manifest.json` et `src/version.json`
4. Crée un commit automatique pour la version

### Hook Pre-push
Le hook `pre-push` affiche la version actuelle avant de pousser vers le dépôt distant.

## 📁 Fichiers Modifiés

Le système de version met à jour automatiquement :

- **`package.json`** : Version principale du projet
- **`public/manifest.json`** : Version de l'application PWA
- **`src/version.json`** : Informations détaillées de build

### Exemple de `src/version.json`
```json
{
  "version": "1.2.3",
  "buildDate": "2024-01-15T10:30:00.000Z",
  "buildNumber": 1705312200000
}
```

## 🛠️ Personnalisation

### Changer le Type d'Incrémentation Automatique
Modifiez le fichier `scripts/pre-commit-hook.js` ligne 25 :
```javascript
execSync('node scripts/version-bump.js patch', { stdio: 'inherit' })
// Changer 'patch' par 'minor' ou 'major'
```

### Désactiver l'Incrémentation Automatique
Supprimez ou renommez le fichier `.git/hooks/pre-commit` :
```bash
rm .git/hooks/pre-commit
```

### Incrémentation Manuelle Avant Commit
Si vous voulez incrémenter manuellement avant un commit :
```bash
npm run version:patch
git add .
git commit -m "feat: nouvelle fonctionnalité"
```

## 🔍 Vérification

### Vérifier la Version Actuelle
```bash
npm run version:current
```

### Vérifier les Hooks Git
```bash
ls -la .git/hooks/
```

### Vérifier l'Historique des Versions
```bash
git log --oneline --grep="chore: bump version"
```

## 🚨 Dépannage

### Le Hook ne Fonctionne Pas
1. Vérifiez que les hooks sont exécutables :
   ```bash
   chmod +x .git/hooks/pre-commit
   chmod +x .git/hooks/pre-push
   ```

2. Vérifiez que Node.js est accessible :
   ```bash
   which node
   ```

### Erreur de Permissions
```bash
chmod +x scripts/*.js
```

### Réinitialiser le Système
```bash
rm .git/hooks/pre-commit .git/hooks/pre-push
npm run setup:hooks
```

## 📝 Notes Importantes

- L'incrémentation automatique ne fonctionne que sur les branches `main` ou `master`
- Si vous modifiez manuellement les fichiers de version, l'incrémentation automatique est désactivée pour ce commit
- Le système crée un commit automatique séparé pour les changements de version
- La version est synchronisée entre `package.json`, `manifest.json` et `version.json`

## 🎯 Exemples d'Usage

### Workflow Typique
```bash
# 1. Faire des modifications
git add .
git commit -m "feat: ajout nouvelle fonctionnalité"
# → Version automatiquement incrémentée de 1.0.0 à 1.0.1

# 2. Pousser les changements
git push
# → Affiche la version actuelle avant le push
```

### Incrémentation Manuelle
```bash
# Pour une nouvelle fonctionnalité importante
npm run version:minor
git add .
git commit -m "feat: nouvelle fonctionnalité majeure"
git push
```

### Version Majeure
```bash
# Pour un changement breaking
npm run version:major
git add .
git commit -m "feat: refactoring majeur - breaking changes"
git push
```
