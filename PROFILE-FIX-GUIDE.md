# Guide de résolution du problème des profils enfants

## 🎯 Problème identifié

Ayna n'apparaît pas dans la sélection des enfants car elle est configurée comme `is_child: true` mais vous voulez qu'elle soit considérée comme un adolescent (`is_teen: true`).

## 🔧 Solutions disponibles

### Solution 1 : Migration automatique (Recommandée)

Exécutez le script de migration pour convertir Ayna en profil adolescent :

```bash
# Vérifier l'état actuel des profils
npm run check-profiles

# Migrer Ayna vers le statut adolescent
npm run migrate-teens

# Vérifier que la migration a fonctionné
npm run check-profiles
```

### Solution 2 : Modification manuelle en base de données

Si vous préférez modifier directement en base de données :

```sql
UPDATE profiles 
SET 
  type = 'teen',
  is_child = false,
  is_teen = true,
  description = 'Profil adolescent - Accès limité',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Ayna';
```

### Solution 3 : Créer un nouveau profil adolescent

```bash
# Créer un nouveau profil adolescent
npm run create-teen "Nouveau Teen" "Description du profil"
```

## 🧪 Test de la solution

1. **Accédez au composant de test :** `/profile-test`
2. **Vérifiez que tous les profils s'affichent correctement**
3. **Testez le scanner de leçons :** `/lesson-scanner`

## 📊 Vérification des profils

Le composant `ProfileTest.vue` vous permet de voir :
- Tous les profils de la base de données
- Les profils enfants (childProfiles)
- Les profils adolescents (teenProfiles)  
- Les profils non-administrateurs (nonAdminProfiles)

## 🔍 Code modifié

### Dans `src/stores/profileStore.js`
```javascript
// Nouveau getter pour tous les profils non-administrateurs
nonAdminProfiles: (state) => state.profiles.filter(profile => 
  profile.is_active && !profile.is_admin && (profile.is_child || profile.is_teen)
),
```

### Dans `src/components/LessonScanner.vue`
```javascript
computed: {
  childProfiles() {
    const store = useProfileStore()
    // Utiliser le nouveau getter pour tous les profils non-administrateurs
    return store.nonAdminProfiles || []
  }
},
```

## 🎯 Résultat attendu

Après la migration, vous devriez voir :
- **Ayna** dans la sélection des enfants (car elle sera `is_teen: true`)
- **Nolann** et **Elyo** restent comme enfants (`is_child: true`)
- **Parent** reste comme administrateur (`is_admin: true`)

## 🚀 Commandes utiles

```bash
# Vérifier l'état des profils
npm run check-profiles

# Migrer les profils
npm run migrate-teens

# Tester la base de données
npm run db:test

# Initialiser la base de données
npm run db:init
```

## 🔧 Dépannage

Si les profils ne s'affichent toujours pas :

1. **Vérifiez la connexion à la base de données :**
   ```bash
   npm run db:test
   ```

2. **Rechargez les profils dans l'application :**
   - Allez sur `/profile-test`
   - Cliquez sur "Actualiser"

3. **Vérifiez les logs de la console** pour des erreurs

4. **Vérifiez que les profils sont actifs :**
   ```sql
   SELECT name, is_active, is_admin, is_child, is_teen 
   FROM profiles 
   ORDER BY name;
   ```

## 📝 Notes importantes

- Les profils doivent être `is_active = true` pour apparaître
- Les profils administrateurs (`is_admin = true`) n'apparaissent pas dans la sélection
- Le filtre inclut maintenant les profils `is_child = true` ET `is_teen = true`
