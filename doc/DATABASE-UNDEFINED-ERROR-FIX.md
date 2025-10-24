# Correction : Erreur "invalid input syntax for type integer: undefined" - Neon Database

## Problème Identifié

**Erreur reçue sur Vercel :**
```
NeonDbError: invalid input syntax for type integer: "undefined"
    at handleProfile (/var/task/api/index.js:296:24)
    
Error details:
  code: '22P02'
  severity: 'ERROR'
  where: "unnamed portal parameter $1 = '...'"
```

### Cause Racine

Lors de l'extraction de l'ID du profil depuis l'URL, le code utilisait une approche peu robuste :

```javascript
// ❌ PROBLÈME
const pathParts = pathname.split('/').filter(p => p);
const id = pathParts[2]; // Peut être undefined!
```

**Scénarios problématiques :**
- URL `/api/profiles/` → `pathParts = ['api', 'profiles']` → `id = undefined`
- URL malformée ou inattendues → `id = undefined`

Quand `id` est `undefined`, le template SQL le convertit en string `"undefined"` :
```javascript
WHERE id = ${id}  // Devient: WHERE id = undefined
// PostgreSQL reçoit: WHERE id = 'undefined'
// Erreur: Cannot convert 'undefined' to integer!
```

## Solution Implémentée

### Extraction Robuste avec Regex

Remplacé l'approche par array par une extraction regex qui est plus sûre :

```javascript
// ✅ SOLUTION
const idMatch = pathname.match(/\/api\/profiles\/(\d+)/);
const id = idMatch ? idMatch[1] : null;
```

**Avantages :**
- ✅ Extrait uniquement les ID numériques valides
- ✅ Retourne `null` si pas d'ID trouvé
- ✅ Fonctionne avec les routes imbriquées (`/api/profiles/1/pin`)
- ✅ Plus lisible et maintenable

### Détection des Routes Imbriquées Améliorée

```javascript
// ✅ Nouveau : Détection via regex
const isNestedRoute = pathname.includes(`/api/profiles/${id}/`);
const nestedMatch = pathname.match(new RegExp(`/api/profiles/${id}/([a-z-]+)`));
const nestedPath = nestedMatch ? nestedMatch[1] : null;

// Exemples :
// /api/profiles/1 → nestedPath = null
// /api/profiles/1/pin → nestedPath = 'pin'
// /api/profiles/1/lessons → nestedPath = 'lessons'
```

## Comparaison Avant/Après

### Avant (Problématique)

```javascript
async function handleProfile(req, res) {
  const pathParts = pathname.split('/').filter(p => p);
  const id = pathParts[2]; // Peut être undefined!
  
  if (!id) {
    // Check ne suffit pas toujours
    return res.status(400).json(...);
  }
  
  // Si id = undefined, l'erreur arrive ici:
  const profiles = await sql`
    WHERE id = ${id}  // ❌ Erreur "undefined"
  `;
}
```

**Problèmes :**
- Extraction fragile
- Relies sur des indices de array
- Pas de validation que c'est un nombre
- Check `if (!id)` ne suffit pas

### Après (Robuste)

```javascript
async function handleProfile(req, res) {
  // Extraction regex stricte
  const idMatch = pathname.match(/\/api\/profiles\/(\d+)/);
  const id = idMatch ? idMatch[1] : null;
  
  if (!id) {
    return res.status(400).json(...); // ✅ Capture correctement
  }
  
  // id est garanti d'être une string numérique
  const profiles = await sql`
    WHERE id = ${id}  // ✅ Fonctionne correctement
  `;
}
```

**Améliorations :**
- ✅ Extraction via regex fiable
- ✅ `id` est toujours soit un nombre valide, soit `null`
- ✅ Pas de valeurs `undefined` qui traînent
- ✅ Routes imbriquées gérées correctement

## Patterns de Routes Gérées

| URL Pattern | Résultat |
|------------|----------|
| `/api/profiles` | ❌ Appelle `handleProfiles` |
| `/api/profiles/` | ✅ `id = null` → Erreur 400 |
| `/api/profiles/1` | ✅ `id = '1'` |
| `/api/profiles/1/pin` | ✅ `id = '1'`, `nestedPath = 'pin'` |
| `/api/profiles/1/lessons` | ✅ `id = '1'`, `nestedPath = 'lessons'` |
| `/api/profiles/invalid` | ✅ `id = null` → Erreur 400 |

## Leçons Apprises

### ❌ Anti-pattern

```javascript
// Fragile - relies sur les indices
const parts = pathname.split('/');
const id = parts[2]; // Risqué!
```

### ✅ Pattern Recommandé

```javascript
// Robuste - utilise des regex
const match = pathname.match(/\/api\/resource\/(\d+)/);
const id = match ? match[1] : null;
```

## Tests Recommandés

```bash
# Test : URL sans ID → Erreur 400
curl https://api.vercel.app/api/profiles/

# Test : URL avec ID invalide → Erreur 400
curl https://api.vercel.app/api/profiles/invalid

# Test : URL avec ID valide → Succès
curl https://api.vercel.app/api/profiles/1

# Test : URL imbriquée → Succès
curl -X POST https://api.vercel.app/api/profiles/1/pin \
  -d '{"pin":"1234"}'
```

## Fichier Modifié

- `backend/api/index.js` - Fonction `handleProfile()`

## Commit

```
7d1f294 fix: corriger extraction d'ID du profil pour éviter les erreurs 'undefined'
```

## Impact sur Autres Routes

Les handlers `handleLesson` et `handleNotification` utilisent déjà une approche légèrement différente mais équivalente :

```javascript
const id = url.pathname.split('/').pop();
```

Cette approche fonctionne pour eux car elle retourne une string vide `''` plutôt que `undefined`, ce qui est falsy et est correctement géré par `if (!id)`.

Cependant, les corrections pourraient être appliquées à ces handlers également pour plus de consistance.

## Migration vers Production

Cette correction doit être déployée immédiatement car elle élimine une classe entière d'erreurs de base de données.

### Checklist
- [ ] Code mergé dans main
- [ ] Tests sur staging
- [ ] Déploiement sur Vercel
- [ ] Surveillance des logs Neon
- [ ] Confirmation que les erreurs "undefined" ont disparu
