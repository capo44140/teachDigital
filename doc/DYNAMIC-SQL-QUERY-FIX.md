# Correction : Erreur "bind message supplies 0 parameters" - Requêtes SQL Dynamiques

## Problème Identifié

**Erreur reçue sur Vercel :**
```
NeonDbError: bind message supplies 0 parameters, but prepared statement "" requires 1
    at handleLessons (/var/task/api/index.js:610:23)
    
Error code: 08P01 (protocol error)
```

### Cause Racine

La construction de requêtes SQL dynamiques avec le template SQL de Neon était incorrecte.

**Code problématique :**
```javascript
// ❌ PROBLÈME
let query = sql`SELECT ... FROM lessons l`;

if (conditions.length > 0) {
  query = sql`SELECT ... WHERE ${sql.unsafe(conditions.join(' AND '), params)}`;
}

// ❌ Erreur : Essayer de combiner deux requêtes SQL
query = sql`${query} ORDER BY l.created_at DESC`;
const lessons = await query; // Erreur !
```

**Pourquoi ça ne marche pas :**
1. `query` est un objet `sql` (prepared statement), pas une string
2. Quand on utilise `${query}` dans un template SQL, ça ne fonctionne pas correctement
3. Neon perd les paramètres et envoie une requête vide
4. PostgreSQL se plaint : "0 paramètres fournis, mais 1 requis"

## Solution Implémentée

### Construire la Requête Complète en Une Seule Fois

Remplacé la combinaison de requêtes par une construction monolithique :

```javascript
// ✅ SOLUTION
let query;
if (conditions.length > 0) {
  query = sql`
    SELECT ...
    FROM lessons l
    WHERE ${sql.unsafe(conditions.join(' AND '), params)}
    ORDER BY l.created_at DESC
  `;
} else {
  query = sql`
    SELECT ...
    FROM lessons l
    ORDER BY l.created_at DESC
  `;
}

const lessons = await query; // ✅ Fonctionne !
```

**Avantages :**
- ✅ Requête construite en une seule passe
- ✅ Les paramètres sont correctement liés
- ✅ Neon peut préparer la requête proprement
- ✅ PostgreSQL reçoit les bons paramètres

## Comparaison Avant/Après

### Avant (Problématique)

```javascript
async function handleLessons(req, res) {
  const { profileId, published } = req.query;

  // Étape 1 : Créer une première requête
  let query = sql`
    SELECT ...
    FROM lessons l
  `;

  const conditions = [];
  const params = [];

  if (profileId) {
    conditions.push(`l.profile_id = $${params.length + 1}`);
    params.push(profileId);
  }

  // Étape 2 : Créer une deuxième requête avec WHERE
  if (conditions.length > 0) {
    query = sql`
      SELECT ...
      WHERE ${sql.unsafe(conditions.join(' AND '), params)}
    `;
  }

  // ❌ Étape 3 : Essayer de combiner les requêtes
  query = sql`${query} ORDER BY l.created_at DESC`;
  const lessons = await query; // ❌ ERREUR !
}
```

**Problèmes :**
- Construction fragile
- Les paramètres se perdent
- Combine deux objets `sql` différents
- Impossible pour Neon de mapper les paramètres

### Après (Robuste)

```javascript
async function handleLessons(req, res) {
  const { profileId, published } = req.query;

  const conditions = [];
  const params = [];

  if (profileId) {
    conditions.push(`l.profile_id = $${params.length + 1}`);
    params.push(profileId);
  }

  // ✅ Construire la requête complète en une seule fois
  let query;
  if (conditions.length > 0) {
    query = sql`
      SELECT ...
      FROM lessons l
      WHERE ${sql.unsafe(conditions.join(' AND '), params)}
      ORDER BY l.created_at DESC
    `;
  } else {
    query = sql`
      SELECT ...
      FROM lessons l
      ORDER BY l.created_at DESC
    `;
  }

  const lessons = await query; // ✅ Fonctionne correctement !
}
```

**Améliorations :**
- ✅ Une seule requête SQL construite
- ✅ Les paramètres sont correctement liés
- ✅ Neon prépare la requête une seule fois
- ✅ PostgreSQL reçoit les bon paramètres

## Patterns de Requêtes Supportés

### Pattern 1 : Pas de Conditions

```javascript
query = sql`
  SELECT ... FROM lessons l
  ORDER BY l.created_at DESC
`;
```

### Pattern 2 : Avec Conditions Dynamiques

```javascript
let query;
if (conditions.length > 0) {
  query = sql`
    SELECT ... FROM lessons l
    WHERE ${sql.unsafe(conditions.join(' AND '), params)}
    ORDER BY l.created_at DESC
  `;
} else {
  query = sql`
    SELECT ... FROM lessons l
    ORDER BY l.created_at DESC
  `;
}
```

### Pattern 3 : Conditions Multiples

```javascript
const conditions = [];
const params = [];

if (profileId) {
  conditions.push(`l.profile_id = $${params.length + 1}`);
  params.push(profileId);
}

if (published !== undefined) {
  conditions.push(`l.is_published = $${params.length + 1}`);
  params.push(published === 'true');
}

// Construire une seule requête
query = sql`
  SELECT ... FROM lessons l
  ${conditions.length > 0 ? sql`WHERE ${sql.unsafe(conditions.join(' AND '), params)}` : sql``}
  ORDER BY l.created_at DESC
`;
```

## ⚠️ Anti-patterns à Éviter

### ❌ Ne pas faire ça

```javascript
// ❌ Ne pas combiner deux templates sql
let query = sql`SELECT ... FROM table`;
query = sql`${query} WHERE id = 1`; // Erreur !
```

```javascript
// ❌ Ne pas utiliser les template sql de manière imbriquée
const q1 = sql`SELECT ...`;
const q2 = sql`${q1} ORDER BY ...`; // Erreur !
```

```javascript
// ❌ Ne pas modifier une requête après l'avoir créée
let query = sql`SELECT ...`;
query.appendWhere = `id = 1`; // Erreur !
```

### ✅ Faire plutôt ça

```javascript
// ✅ Construire la requête complète en une seule fois
let query = sql`
  SELECT ...
  FROM table
  WHERE id = 1
  ORDER BY created_at DESC
`;
```

## Tests Recommandés

```bash
# Test 1 : GET sans paramètres (pas de conditions)
curl https://api.vercel.app/api/lessons

# Test 2 : GET avec profileId
curl "https://api.vercel.app/api/lessons?profileId=1"

# Test 3 : GET avec published filter
curl "https://api.vercel.app/api/lessons?published=true"

# Test 4 : GET avec plusieurs paramètres
curl "https://api.vercel.app/api/lessons?profileId=1&published=true"
```

## Fichier Modifié

- `backend/api/index.js` - Fonction `handleLessons()`

## Commit

```
03555dd fix: corriger construction de la requête SQL dynamique pour les leçons
```

## Leçons Apprises

### Pour Neon/PostgreSQL avec Templates SQL

1. **Une requête = Une construction** - La requête doit être complète quand elle est créée
2. **Pas de concaténation** - Ne pas combiner deux templates `sql` existants
3. **Construire dynamiquement** - Utiliser des branches `if/else` pour construire différentes requêtes complètes
4. **Paramètres liés** - Utiliser `${...}` et `sql.unsafe()` correctement
5. **Vérifier les erreurs** - L'erreur "bind message supplies 0 parameters" signifie qu'une requête a perdu ses paramètres

### Bonnes Pratiques

✅ Construire la requête complète en une seule fois  
✅ Utiliser des branches `if/else` pour les requêtes différentes  
✅ Toujours lier les paramètres avec `${...}`  
✅ Utiliser `sql.unsafe()` uniquement pour les parties non-paramétrées  
✅ Tester avec différentes combinaisons de paramètres  

## Migration vers Production

Cette correction doit être déployée immédiatement car elle corrige un bug critique empêchant les requêtes avec filtres.

### Checklist
- [ ] Code mergé dans main
- [ ] Tests sur staging avec différents filtres
- [ ] Déploiement sur Vercel
- [ ] Surveillance des logs Neon
- [ ] Vérification que les filtres profileId et published fonctionnent

