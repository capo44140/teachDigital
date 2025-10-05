# Scanner de Leçons avec IA

## Fonctionnalité

Le scanner de leçons permet aux parents de :
1. Scanner ou télécharger une image de leçon
2. Sélectionner l'enfant pour qui générer l'interrogation
3. Générer automatiquement une interrogation adaptée à l'âge et au niveau de l'enfant
4. Proposer l'interrogation à l'enfant sélectionné

## Comment utiliser

### 1. Accès au scanner
- Connectez-vous en tant que parent
- Dans le dashboard parent, cliquez sur "Scanner des leçons"

### 2. Sélection de l'enfant
- Choisissez l'enfant pour qui vous voulez générer l'interrogation
- Les profils enfants disponibles s'affichent automatiquement

### 3. Scan de la leçon
- Glissez-déposez une image de leçon dans la zone de téléchargement
- Ou cliquez sur "Parcourir les fichiers" pour sélectionner une image
- Formats supportés : JPG, PNG, PDF

### 4. Génération de l'interrogation
- Cliquez sur "Générer l'interrogation"
- L'IA analyse le contenu de la leçon
- Une interrogation adaptée est générée automatiquement

### 5. Passage du quiz
- L'enfant peut maintenant passer l'interrogation
- Questions à choix multiples avec explications
- Score et feedback à la fin

## Configuration IA

### Mode démo (par défaut)
- Fonctionne sans configuration
- Utilise des quiz prédéfinis pour les tests
- Parfait pour tester l'interface

### Mode IA avancé
- Ajoutez votre clé API OpenAI dans `.env` :
```
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```
- Obtient une clé sur : https://platform.openai.com/api-keys
- Analyse réelle des images avec GPT-4 Vision
- Génération personnalisée des quiz

## Composants créés

### LessonScanner.vue
- Interface de scan des leçons
- Sélection du profil enfant
- Téléchargement et aperçu des images
- Intégration avec le service IA

### QuizGenerator.vue
- Affichage et gestion des quiz
- Interface de passage du quiz
- Calcul des scores et feedback
- Navigation entre les questions

### AIService.js
- Service d'analyse d'images avec IA
- Génération de quiz personnalisés
- Mode démo et mode IA avancé
- Gestion des erreurs et fallbacks

## Routes ajoutées

- `/lesson-scanner` - Interface de scan
- `/quiz-generator` - Interface de quiz

## Intégration

Le scanner est intégré dans le dashboard parent avec un bouton dédié dans la section d'administration.

## Fonctionnalités techniques

- **Analyse d'images** : Reconnaissance du contenu des leçons
- **Génération adaptative** : Quiz adaptés à l'âge et au niveau
- **Interface intuitive** : Design moderne et responsive
- **Gestion d'erreurs** : Fallback vers le mode démo
- **Performance** : Optimisé pour les appareils mobiles
