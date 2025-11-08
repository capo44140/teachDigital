# Analyse des Timeouts Vercel (60 secondes)

## 🔍 Problèmes Identifiés

### 1. ⚠️ Système de Retry Base de Données (CRITIQUE)
**Fichier**: `backend/lib/database.js`

**Problème**:
- `executeWithRetry` fait jusqu'à **5 tentatives** avec backoff exponentiel
- Délais: 1s, 2s, 4s, 8s, 16s = **31 secondes de délais** au maximum
- Chaque tentative peut prendre plusieurs secondes
- **Total possible**: 31s (délais) + 5 × temps_requête = peut dépasser 60s facilement

**Code problématique**:
```javascript
async function executeWithRetry(queryFn, maxRetries = 5, delayMs = 1000) {
  // Backoff exponentiel: 1s, 2s, 4s, 8s, 16s = 31s total
  const delay = delayMs * Math.pow(2, attempt - 1);
}
```

### 2. ⚠️ Appels API Externes Sans Timeout (CRITIQUE)
**Fichier**: `backend/api/ai.js`

**Problème**:
- Les appels `fetch()` vers OpenAI, Gemini, Groq n'ont **aucun timeout**
- Si l'API externe est lente ou bloque, la requête peut pendre indéfiniment
- Vercel timeout à 60s, mais l'appel peut bloquer jusqu'à ce timeout

**Code problématique**:
```javascript
const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
  // ❌ Pas de timeout !
});
```

### 3. ⚠️ Retries dans les Fonctions AI (MOYEN)
**Fichier**: `backend/api/ai.js`

**Problème**:
- `analyzeImageWithGemini` et `generateQuizWithGemini` font jusqu'à 2-3 retries
- Délais croissants: 1s, 2s, 3s = **6 secondes** de délais
- Chaque appel API peut prendre 10-30 secondes
- **Total possible**: 6s (délais) + 3 × 30s (appels) = 96s (dépasse 60s !)

**Code problématique**:
```javascript
if (retryCount < maxRetries) {
  await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
  return analyzeImageWithGemini(base64Image, retryCount + 1);
}
```

### 4. ⚠️ Requêtes SQL Sans Timeout (MOYEN)
**Fichier**: `backend/lib/database.js`

**Problème**:
- Les requêtes SQL n'ont pas de timeout explicite
- Configuration: `statement_timeout: 0` et `query_timeout: 0` (désactivés)
- Une requête lente peut bloquer jusqu'au timeout Vercel

**Code problématique**:
```javascript
statement_timeout: 0, // ❌ Pas de timeout !
query_timeout: 0,     // ❌ Pas de timeout !
```

### 5. ⚠️ Utilisation de executeWithRetry sur Requêtes Simples (MOYEN)
**Fichier**: `backend/api/index.js`

**Problème**:
- `handleLessons` utilise `executeWithRetry` pour des requêtes simples
- Ces requêtes n'ont pas besoin de retry automatique
- Le retry ajoute du temps inutile

**Code problématique**:
```javascript
lessons = await executeWithRetry(() => sql`SELECT ...`);
```

## ✅ Solutions Proposées

### Solution 1: Ajouter Timeout sur Appels API Externes
```javascript
// Fonction helper pour fetch avec timeout
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout après ${timeoutMs}ms`);
    }
    throw error;
  }
}
```

### Solution 2: Réduire Retries Base de Données
```javascript
// Réduire de 5 à 2-3 tentatives max
async function executeWithRetry(queryFn, maxRetries = 2, delayMs = 500) {
  // Délais plus courts: 500ms, 1000ms = 1.5s total max
}
```

### Solution 3: Ajouter Timeout sur Requêtes SQL
```javascript
// Configuration avec timeout
statement_timeout: 20000, // 20 secondes max
query_timeout: 20000,     // 20 secondes max
```

### Solution 4: Limiter Retries AI
```javascript
// Réduire retries et délais
const maxRetries = 1; // Au lieu de 2-3
const delay = 500; // Au lieu de 1000 * (retryCount + 1)
```

### Solution 5: Retirer executeWithRetry des Requêtes Simples
```javascript
// Utiliser directement sql`...` au lieu de executeWithRetry
const lessons = await sql`SELECT ...`;
```

## 📊 Temps Maximum Estimés (Après Corrections)

| Opération | Avant | Après | Gain |
|-----------|-------|-------|------|
| Retry DB (5x) | 31s + requêtes | 1.5s + requêtes | -29.5s |
| Appel API externe | ∞ (bloque) | 30s max | Limité |
| Retry AI (3x) | 6s + appels | 0.5s + appels | -5.5s |
| Requête SQL lente | ∞ (bloque) | 20s max | Limité |

**Total maximum estimé après corrections**: ~50-55 secondes (sous la limite de 60s)

## 🎯 Priorités de Correction

1. **URGENT**: Ajouter timeout sur appels API externes
2. **URGENT**: Réduire retries base de données
3. **IMPORTANT**: Ajouter timeout sur requêtes SQL
4. **IMPORTANT**: Limiter retries AI
5. **MOYEN**: Retirer executeWithRetry des requêtes simples

