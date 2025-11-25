# 🔧 Dépannage des Tests

## Problèmes Identifiés et Solutions

### ❌ Problème 1: Timeout dans les `beforeAll` hooks

**Symptôme:**
```
Exceeded timeout of 5000 ms for a hook.
```

**Cause:**
- Le timeout par défaut de Jest (5000ms) est trop court pour les opérations de base de données
- La connexion à la base de données peut prendre du temps
- Les opérations de création de profils et PIN peuvent être lentes

**Solution:**
1. ✅ Timeout global augmenté à 30 secondes dans `tests/setup.js`
2. ✅ Timeout explicite de 30 secondes ajouté à tous les `beforeAll`
3. ✅ Gestion d'erreurs améliorée dans les helpers

### ❌ Problème 2: Connexion à la base de données lente

**Symptôme:**
- Les tests se bloquent lors de la connexion
- Timeout même avec 30 secondes

**Solutions:**
1. Vérifier la connexion avant les tests:
   ```bash
   cd backend
   node tests/check-db-connection.js
   ```

2. Vérifier les variables d'environnement:
   - `DATABASE_URL` ou (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
   - `JWT_SECRET`

3. Vérifier que la base de données est accessible:
   - Ping du serveur
   - Vérification des credentials
   - Vérification du firewall/port

### ❌ Problème 3: Variables d'environnement non chargées

**Symptôme:**
- Erreurs de connexion même avec la base de données configurée
- `JWT_SECRET` manquant

**Solution:**
- ✅ Le fichier `tests/setup.js` charge automatiquement les variables d'environnement
- ✅ Vérification des variables essentielles avec messages d'avertissement
- ✅ Valeur par défaut pour `JWT_SECRET` en mode test

## ✅ Corrections Appliquées

### 1. Configuration Jest (`package.json`)
```json
{
  "jest": {
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "testTimeout": 30000
  }
}
```

### 2. Fichier de Setup (`tests/setup.js`)
- Timeout global de 30 secondes
- Chargement automatique des variables d'environnement
- Vérification des variables essentielles
- Messages d'avertissement clairs

### 3. Timeouts dans les Tests
Tous les `beforeAll` ont maintenant un timeout explicite:
```javascript
beforeAll(async () => {
  // ... code ...
}, 30000); // 30 secondes
```

### 4. Gestion d'Erreurs Améliorée
- Try/catch dans tous les `beforeAll`
- Messages d'erreur détaillés
- Logs pour le débogage

### 5. Helpers Améliorés
- Noms de profils uniques (avec timestamp)
- Gestion d'erreurs dans `createTestProfile` et `createTestPin`
- Validation des résultats

## 🚀 Exécution des Tests

### Vérifier la connexion d'abord:
```bash
cd backend
node tests/check-db-connection.js
```

### Lancer les tests:
```bash
cd backend
pnpm test
```

### Mode watch:
```bash
pnpm test:watch
```

### Avec couverture:
```bash
pnpm test:coverage
```

## 📋 Checklist de Vérification

Avant de lancer les tests, vérifiez:

- [ ] Variables d'environnement configurées (`.env` dans `backend/` ou à la racine)
- [ ] Base de données accessible (test avec `check-db-connection.js`)
- [ ] `JWT_SECRET` défini (ou valeur par défaut utilisée)
- [ ] Tables de base de données créées
- [ ] Connexion réseau stable

## 🐛 Si les Tests Échouent Encore

1. **Vérifier les logs:**
   - Les erreurs sont maintenant loggées avec plus de détails
   - Chercher les messages d'erreur dans la console

2. **Vérifier la connexion:**
   ```bash
   node tests/check-db-connection.js
   ```

3. **Vérifier les variables d'environnement:**
   ```bash
   # Dans backend/
   cat .env | grep -E "(DATABASE|JWT)"
   ```

4. **Tester un seul fichier:**
   ```bash
   pnpm test auth.test.js
   ```

5. **Augmenter le timeout si nécessaire:**
   - Modifier `testTimeout` dans `package.json`
   - Modifier le timeout dans les `beforeAll` (actuellement 30000ms)

## 📝 Notes

- Les tests créent des données de test qui sont automatiquement nettoyées
- Les noms de profils incluent un timestamp pour éviter les conflits
- Le timeout de 30 secondes devrait être suffisant pour la plupart des cas
- Si la base de données est très lente, envisager d'augmenter le timeout

