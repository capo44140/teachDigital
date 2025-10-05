# Améliorations de sécurité - TeachDigital

## 🔒 Nouvelles fonctionnalités de sécurité implémentées

### 1. Rate Limiting pour les APIs IA

**Fichier :** `src/services/rateLimitService.js`

**Fonctionnalités :**
- Limite le nombre de requêtes par utilisateur et par période
- Support pour OpenAI et Gemini avec des limites différentes
- Gestion des limites de rafale (burst) et de fenêtre temporelle
- Statistiques en temps réel

**Limites configurées :**
- **OpenAI :** 10 requêtes/heure, 3 en rafale
- **Gemini :** 15 requêtes/heure, 5 en rafale

**Utilisation :**
```javascript
// Vérifier avant une requête
const rateLimitCheck = rateLimitService.checkRateLimit(userId, 'openai')
if (!rateLimitCheck.allowed) {
  // Gérer la limite atteinte
}

// Enregistrer une requête
rateLimitService.recordRequest(userId, 'openai')
```

### 2. Validation côté serveur des images

**Fichier :** `src/services/imageValidationService.js`

**Fonctionnalités :**
- Validation du type MIME et des magic numbers
- Vérification de la taille et des dimensions
- Détection de contenu malveillant
- Optimisation automatique des images
- Recommandations de performance

**Types supportés :**
- JPEG, PNG, GIF, WebP
- Taille max : 10MB
- Dimensions max : 4096x4096

**Utilisation :**
```javascript
const validator = new ImageValidationService()
const validation = await validator.validateImage(file)

if (!validation.valid) {
  console.error('Erreurs:', validation.errors)
  console.warn('Avertissements:', validation.warnings)
}
```

### 3. Chiffrement des données sensibles

**Fichier :** `src/services/encryptionService.js`

**Fonctionnalités :**
- Chiffrement AES-GCM avec Web Crypto API
- Support des mots de passe avec dérivation PBKDF2
- Chiffrement des données de profil sensibles
- Génération de tokens sécurisés
- Vérification d'intégrité

**Données chiffrées :**
- Descriptions de profils
- Contenu d'avatars
- Données d'images
- Informations sensibles

**Utilisation :**
```javascript
const encryptionService = new EncryptionService()

// Chiffrer avec mot de passe
const encrypted = await encryptionService.encryptWithPassword(data, password)

// Déchiffrer
const decrypted = await encryptionService.decryptWithPassword(encrypted, password)
```

### 4. Logs d'audit pour la sécurité

**Fichier :** `src/services/auditLogService.js`

**Fonctionnalités :**
- Enregistrement de tous les événements sensibles
- Catégorisation des événements (auth, data, security, etc.)
- Niveaux de criticité (info, warning, error, critical)
- Détection d'alertes automatiques
- Export des logs
- Statistiques de sécurité

**Événements enregistrés :**
- Tentatives de connexion
- Changements de profils
- Utilisation des APIs IA
- Violations de sécurité
- Accès aux données sensibles
- Erreurs système

**Utilisation :**
```javascript
// Enregistrer un événement
auditLogService.logAuthentication(userId, success, 'pin', details)

// Récupérer les logs
const logs = auditLogService.getLogs(filters)

// Statistiques
const stats = auditLogService.getSecurityStats(7)
```

## 🎯 Intégration dans l'application

### LessonScanner.vue
- Validation des images avant upload
- Rate limiting avant génération de quiz
- Logs d'audit pour toutes les actions
- Affichage des avertissements de validation

### ProfileService.js
- Chiffrement des données sensibles
- Logs d'audit pour les changements de profils
- Gestion des erreurs avec logging

### SecurityDashboard.vue
- Interface de surveillance des logs
- Statistiques de sécurité en temps réel
- Filtres et export des logs
- Détection d'alertes

## 🚨 Alertes automatiques

Le système détecte automatiquement :

1. **Force brute :** 5 échecs de connexion en 15 minutes
2. **Échecs API répétés :** 10 échecs en 5 minutes
3. **Violations de sécurité :** Contenu suspect, accès non autorisés
4. **Erreurs système :** Pannes, erreurs de validation

## 📊 Tableau de bord de sécurité

**Accès :** `/security-dashboard`

**Fonctionnalités :**
- Statistiques en temps réel
- Filtres avancés pour les logs
- Export des données d'audit
- Détails des événements
- Surveillance des utilisateurs

## 🔧 Configuration

### Variables d'environnement
```env
# Rate limiting
RATE_LIMIT_OPENAI_REQUESTS=10
RATE_LIMIT_OPENAI_WINDOW=3600000
RATE_LIMIT_GEMINI_REQUESTS=15
RATE_LIMIT_GEMINI_WINDOW=3600000

# Validation d'images
MAX_IMAGE_SIZE=10485760
MAX_IMAGE_DIMENSIONS=4096
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Audit logs
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_MAX_ENTRIES=10000
```

## 🛡️ Bonnes pratiques de sécurité

1. **Toujours valider les données** avant traitement
2. **Chiffrer les données sensibles** en base
3. **Surveiller les logs** régulièrement
4. **Limiter les requêtes** pour éviter les abus
5. **Détecter les anomalies** automatiquement

## 📈 Métriques de sécurité

Le système fournit des métriques sur :
- Nombre d'événements par catégorie
- Taux d'échec des connexions
- Utilisation des APIs IA
- Violations de sécurité
- Performance des validations

## 🔄 Maintenance

### Nettoyage automatique
- Suppression des logs anciens (>90 jours)
- Limitation du nombre de logs en mémoire
- Nettoyage des sessions expirées

### Surveillance continue
- Alertes en temps réel
- Rapports de sécurité
- Détection d'intrusions
- Analyse des patterns d'usage

## 🚀 Déploiement

1. **Développement :** Tous les services sont actifs
2. **Production :** Configuration des limites et alertes
3. **Monitoring :** Surveillance des métriques de sécurité
4. **Backup :** Sauvegarde des logs d'audit

---

Ces améliorations renforcent considérablement la sécurité de l'application TeachDigital en ajoutant des couches de protection, de surveillance et de chiffrement des données sensibles.
