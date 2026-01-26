# 🎨 Système Liquid Glass Centralisé - Guide d'Utilisation

## 🚀 Démarrage Rapide

### 1. Import des composants
```javascript
import { 
  GlassLayout, 
  GlassCard, 
  GlassButton, 
  GlassBadge,
  GlassProgress,
  GlassToggle
} from '@/components/ui'
```

### 2. Structure de base
```vue
<template>
  <GlassLayout>
    <GlassCard>
      <h1 class="lg-text-primary">Titre</h1>
      <p class="lg-text-secondary">Description</p>
      <GlassButton 
        title="Action" 
        gradient="primary" 
        @click="handleAction" 
      />
    </GlassCard>
  </GlassLayout>
</template>
```

## 🎨 Classes CSS Utilitaires

### Effets Glass
- `.lg-glass-base` - Fond glass de base
- `.lg-glass-light` - Transparence légère
- `.lg-glass-medium` - Transparence moyenne  
- `.lg-glass-heavy` - Transparence forte

### Gradients
- `.lg-gradient-primary` - Violet → Rose
- `.lg-gradient-quiz` - Violet → Rose
- `.lg-gradient-learning` - Vert → Emerald
- `.lg-gradient-profiles` - Bleu → Cyan
- `.lg-gradient-activities` - Orange → Rouge

### Textes
- `.lg-text-primary` - Texte principal (blanc 90%)
- `.lg-text-secondary` - Texte secondaire (blanc 70%)
- `.lg-text-muted` - Texte atténué (blanc 50%)

### Layouts
- `.lg-glass-grid` - Grille responsive
- `.lg-glass-grid-sm` - Grille petite
- `.lg-glass-grid-lg` - Grille grande

## 🧩 Composants Disponibles

### GlassCard
```vue
<GlassCard 
  size="normal"           // small, normal, large
  hoverable="true"        // Effet hover
  custom-class="..."       // Classes personnalisées
  @click="handleClick"     // Événement click
>
  <!-- Contenu -->
</GlassCard>
```

### GlassButton
```vue
<GlassButton
  title="Mon Bouton"      // Texte du bouton
  icon="🎯"               // Icône emoji
  gradient="quiz"         // Gradient de couleur
  size="normal"           // small, normal, large
  disabled="false"         // État désactivé
  @click="handleClick"    // Événement click
/>
```

### GlassBadge
```vue
<GlassBadge
  text="Nouveau"          // Texte du badge
  icon="✨"               // Icône emoji
  gradient="primary"      // Gradient de couleur
  size="normal"           // small, normal, large
/>
```

### GlassProgress
```vue
<GlassProgress
  :value="75"             // Valeur actuelle
  :max="100"              // Valeur maximale
  label="Progression"     // Label (optionnel)
  description="..."       // Description (optionnel)
  value-format="percentage" // percentage, fraction, custom
/>
```

### GlassToggle
```vue
<GlassToggle
  v-model="isEnabled"     // Valeur booléenne
  label="Activer"         // Label du toggle
  description="..."       // Description (optionnel)
  disabled="false"        // État désactivé
  @change="handleChange"  // Événement de changement
/>
```

### GlassLayout
```vue
<GlassLayout>
  <!-- Contenu de la page avec arrière-plan animé -->
</GlassLayout>
```

## 🎯 Exemples d'Usage

### Page de Statistiques
```vue
<template>
  <GlassLayout>
    <div class="lg-glass-grid mb-8">
      <GlassCard 
        v-for="stat in stats" 
        :key="stat.id"
        size="normal"
        custom-class="lg-fade-in-up"
      >
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center" 
               :class="stat.gradient">
            <span class="text-white text-xl">{{ stat.icon }}</span>
          </div>
          <div>
            <h3 class="lg-text-primary text-lg font-semibold">{{ stat.title }}</h3>
            <p class="lg-text-secondary text-sm">{{ stat.value }}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  </GlassLayout>
</template>
```

### Formulaire avec Toggle
```vue
<template>
  <GlassCard>
    <h2 class="lg-text-primary text-xl font-bold mb-6">Paramètres</h2>
    
    <div class="space-y-4">
      <GlassToggle
        v-model="notifications"
        label="Notifications"
        description="Recevoir les notifications push"
      />
      
      <GlassToggle
        v-model="darkMode"
        label="Mode sombre"
        description="Activer le thème sombre"
      />
    </div>
    
    <div class="mt-6">
      <GlassButton 
        title="Sauvegarder" 
        gradient="primary" 
        @click="saveSettings" 
      />
    </div>
  </GlassCard>
</template>
```

### Barre de Progression
```vue
<template>
  <GlassCard>
    <GlassProgress
      :value="progress"
      :max="100"
      label="Progression du cours"
      :description="`${completedLessons}/${totalLessons} leçons terminées`"
      value-format="percentage"
    />
  </GlassCard>
</template>
```

## 🔧 Personnalisation

### Variables CSS
```css
:root {
  --lg-primary-purple: #8B5CF6;  /* Couleur principale */
  --lg-glass-light: rgba(255, 255, 255, 0.08); /* Transparence */
  --lg-transition-normal: all 0.3s ease; /* Transition */
}
```

### Classes Personnalisées
```vue
<GlassCard custom-class="my-custom-class">
  <!-- Contenu -->
</GlassCard>
```

### Styles Personnalisés
```vue
<GlassButton 
  :custom-style="{ borderRadius: '20px' }"
  title="Bouton personnalisé" 
/>
```

## 📱 Responsive Design

Le système s'adapte automatiquement :
- **Mobile** (< 640px) : Layout en colonne unique
- **Tablet** (640px - 1024px) : Layout adaptatif  
- **Desktop** (> 1024px) : Layout complet

## 🎬 Animations

### Animation d'entrée
```vue
<GlassCard custom-class="lg-fade-in-up">
  <!-- Contenu avec animation d'entrée -->
</GlassCard>
```

### Délais d'animation
```vue
<GlassCard 
  custom-class="lg-fade-in-up" 
  style="animation-delay: 0.1s"
>
  <!-- Contenu avec délai -->
</GlassCard>
```

## ✅ Bonnes Pratiques

1. **Utilisez GlassLayout** pour les pages complètes
2. **Préférez les composants** aux classes CSS directes
3. **Respectez la hiérarchie** des z-index
4. **Testez sur mobile** pour la responsivité
5. **Utilisez les gradients** appropriés par section

## 🔄 Migration depuis l'Ancien Système

### Avant
```vue
<div class="glass-card">
  <button class="glass-button">Action</button>
</div>
```

### Après
```vue
<GlassCard>
  <GlassButton title="Action" gradient="primary" />
</GlassCard>
```

## 🚀 Prochaines Étapes

1. **Migrer progressivement** les composants existants
2. **Créer de nouveaux composants** selon les besoins
3. **Tester la cohérence** visuelle
4. **Optimiser les performances** selon l'usage

---

📚 **Documentation complète** : `doc/LIQUID-GLASS-CENTRALIZED-SYSTEM.md`  
🔍 **Vérification** : `node scripts/verify-liquid-glass-system.js`
