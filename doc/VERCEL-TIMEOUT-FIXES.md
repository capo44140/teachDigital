# Corrections Appliquées - Timeout Vercel (60s)

## ✅ Corrections Implémentées

### 1. ✅ Système de Retry Base de Données Optimisé
**Fichier**: `backend/lib/database.js`

**Avant**:
- 5 tentatives avec backoff exponentiel (1s, 2s, 4s, 8s, 16s = 31s total)
- Risque de dépasser 60s facilement

**Après**:
- 2 tentatives max avec délai fixe de 500ms
- Total max: 1s de délais (au lieu de 31s)
- **Gain**: -30 secondes

**Code modifié**:
```javascript
// Avant
async function executeWithRetry(queryFn, maxRetries = 5, delayMs = 1000) {
  const delay = delayMs * Math.pow(2, attempt - 1); // Backoff exponentiel
}

// Après
async function executeWithRetry(queryFn, maxRetries = 2, delayMs = 500) {
  const delay = delayMs; // Délai fixe
}
```

### 2. ✅ Timeout sur Requêtes SQL
**Fichier**: `backend/lib/database.js`

**Avant**:
- `statement_timeout: 0` (désactivé)
- `query_timeout: 0` (désactivé)
- Requêtes peuvent bloquer indéfiniment

**Après**:
- `statement_timeout: 20000` (20 secondes)
- `query_timeout: 20000` (20 secondes)
- Limite les requêtes lentes

**Gain**: Requêtes SQL limitées à 20s max

### 3. ✅ Timeout sur Appels API Externes
**Fichier**: `backend/api/ai.js`

**Avant**:
- Appels `fetch()` sans timeout
- Peuvent bloquer indéfiniment jusqu'au timeout Vercel

**Après**:
- Fonction `fetchWithTimeout()` avec timeout de 30s
- Tous les appels OpenAI, Gemini, Groq utilisent cette fonction
- Limite les appels API à 30s max

**Code ajouté**:
```javascript
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  // ...
}
```

**Gain**: Appels API limités à 30s max (au lieu de ∞)

### 4. ✅ Retries AI Réduits
**Fichier**: `backend/api/ai.js`

**Avant**:
- `maxRetries = 2` pour Gemini
- Délais: 1s, 2s, 3s = 6s total
- Chaque appel peut prendre 10-30s
- Total possible: 96s (dépasse 60s !)

**Après**:
- `maxRetries = 1` pour toutes les fonctions Gemini
- Délai fixe de 500ms
- Total max: 0.5s de délais

**Gain**: -5.5 secondes de délais

## 📊 Résumé des Gains

| Optimisation | Avant | Après | Gain |
|--------------|-------|-------|------|
| Retry DB | 31s délais | 1s délais | **-30s** |
| Timeout SQL | ∞ | 20s max | **Limité** |
| Timeout API | ∞ | 30s max | **Limité** |
| Retry AI | 6s délais | 0.5s délais | **-5.5s** |

**Temps maximum estimé après corrections**: ~50-55 secondes (sous la limite de 60s)

## 🎯 Impact

### Avant les Corrections
- ❌ Retry DB: jusqu'à 31s de délais
- ❌ Requêtes SQL: peuvent bloquer indéfiniment
- ❌ Appels API: peuvent bloquer indéfiniment
- ❌ Retry AI: jusqu'à 6s de délais
- **Risque**: Dépassement fréquent du timeout Vercel (60s)

### Après les Corrections
- ✅ Retry DB: max 1s de délais
- ✅ Requêtes SQL: limitées à 20s
- ✅ Appels API: limités à 30s
- ✅ Retry AI: max 0.5s de délais
- **Résultat**: Temps total sous 60s dans la plupart des cas

## 🔍 Points d'Attention

1. **Requêtes SQL très lentes**: Si une requête prend > 20s, elle sera annulée. Vérifier les index et optimiser les requêtes lentes.

2. **Appels API lents**: Si un appel API prend > 30s, il sera annulé. C'est normal pour les APIs externes.

3. **Retry réduit**: Moins de retries = moins de résilience. Si les erreurs temporaires augmentent, considérer augmenter légèrement les retries (mais pas au-delà de 3).

## 📝 Recommandations Futures

1. **Monitoring**: Ajouter des logs pour identifier les opérations qui prennent le plus de temps
2. **Cache**: Mettre en cache les résultats des appels API pour éviter les appels répétés
3. **Pagination**: Pour les grandes requêtes, implémenter la pagination
4. **Index DB**: Vérifier que les index sont optimaux pour les requêtes fréquentes

## ✅ Tests Recommandés

1. Tester avec une requête DB lente (doit timeout à 20s)
2. Tester avec un appel API lent (doit timeout à 30s)
3. Tester avec des erreurs temporaires (retry doit fonctionner)
4. Tester le flux complet de génération de quiz (doit rester sous 60s)

