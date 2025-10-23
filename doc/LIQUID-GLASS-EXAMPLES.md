# Exemples d'Utilisation du Design Liquid Glass

## 📋 Table des matières
1. [Composant Simple](#composant-simple)
2. [Composant Complexe](#composant-complexe)
3. [Personnalisations](#personnalisations)
4. [Adaptations](#adaptations)

---

## Composant Simple

### Dashboard avec Liquid Glass

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <!-- Blobs animés -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
    </div>

    <!-- Header Glass -->
    <header class="relative z-10 backdrop-blur-2xl bg-white/10 border-b border-white/20">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <h1 class="text-3xl font-bold text-white">Mon Tableau de Bord</h1>
      </div>
    </header>

    <!-- Contenu -->
    <main class="relative z-10 max-w-7xl mx-auto px-6 py-12">
      <div class="glass-card p-8">
        <h2 class="text-2xl font-bold text-white mb-6">Bienvenue</h2>
        <p class="text-white/70">Votre interface moderne avec effet Liquid Glass</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

@keyframes blob {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
}

.animate-blob {
  animation: blob 7s infinite;
}
</style>
```

---

## Composant Complexe

### Galerie avec Cartes Glass

```vue
<template>
  <div class="space-y-6">
    <!-- En-tête de section -->
    <div class="glass-card p-6">
      <div class="flex items-center space-x-4">
        <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center">
          <span class="text-2xl">🎨</span>
        </div>
        <div>
          <h3 class="text-2xl font-bold text-white">Galerie</h3>
          <p class="text-white/60">Découvrez nos créations</p>
        </div>
      </div>
    </div>

    <!-- Grille de cartes -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="item in items" :key="item.id" class="group">
        <div class="glass-card p-6 cursor-pointer">
          <div class="w-full h-40 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl mb-4 group-hover:shadow-lg transition-all"></div>
          <h4 class="text-lg font-semibold text-white mb-2">{{ item.title }}</h4>
          <p class="text-white/60">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      items: [
        { id: 1, title: 'Design A', description: 'Moderne et élégant' },
        { id: 2, title: 'Design B', description: 'Fluide et responsive' },
        { id: 3, title: 'Design C', description: 'Performant et beau' },
      ]
    }
  }
}
</script>
```

---

## Personnalisations

### Varier les Gradients

```vue
<!-- Gradient Cyan -->
<div class="glass-card bg-gradient-to-br from-cyan-400 to-blue-400">
  <!-- Contenu -->
</div>

<!-- Gradient Sunset -->
<div class="glass-card bg-gradient-to-br from-orange-400 to-red-600">
  <!-- Contenu -->
</div>

<!-- Gradient Forest -->
<div class="glass-card bg-gradient-to-br from-green-400 to-emerald-600">
  <!-- Contenu -->
</div>
```

### Modifier les Niveaux d'Opacité

```css
/* Très translucide (subtil) */
.glass-card-subtle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Standard */
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* Opaque (plus visible) */
.glass-card-solid {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
}
```

### Différents Niveaux de Blur

```css
/* Léger */
.glass-light {
  backdrop-filter: blur(10px);
}

/* Standard */
.glass-medium {
  backdrop-filter: blur(20px);
}

/* Intense */
.glass-heavy {
  backdrop-filter: blur(40px);
}
```

---

## Adaptations

### Pour Mobile

```vue
<template>
  <div class="glass-card-mobile">
    <!-- Réduit padding et border-radius pour mobiles -->
  </div>
</template>

<style scoped>
.glass-card-mobile {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 1rem;
}

@media (min-width: 768px) {
  .glass-card-mobile {
    border-radius: 2rem;
    padding: 1.5rem;
  }
}
</style>
```

### Pour Dark Mode

```vue
<template>
  <div :class="darkMode ? 'glass-dark' : 'glass-light'">
    <!-- Contenu adapté -->
  </div>
</template>

<style scoped>
/* Light mode */
.glass-light {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
}

/* Dark mode (si nécessaire) */
.glass-dark {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
}
</style>
```

### Avec Animation Au Scroll

```vue
<script>
import { onMounted, ref } from 'vue'

export default {
  setup() {
    const scrolling = ref(false)

    onMounted(() => {
      window.addEventListener('scroll', () => {
        scrolling.value = window.scrollY > 0
      })
    })

    return { scrolling }
  }
}
</script>

<style scoped>
.glass-card {
  transition: all 0.3s ease;
}

.glass-card.scrolling {
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
}
</style>
```

---

## Patterns Courants

### Pattern: Settings Panel

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900">
    <div class="glass-card max-w-2xl mx-auto mt-8">
      <div class="space-y-4">
        <div v-for="setting in settings" :key="setting.id" class="glass-item p-4">
          <div class="flex justify-between items-center">
            <div>
              <h4 class="text-white font-semibold">{{ setting.label }}</h4>
              <p class="text-white/60 text-sm">{{ setting.description }}</p>
            </div>
            <input type="checkbox" :checked="setting.value" class="w-5 h-5">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Pattern: Feature Cards

```vue
<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div v-for="feature in features" :key="feature.id" class="glass-card p-6">
      <div class="text-4xl mb-4">{{ feature.icon }}</div>
      <h3 class="text-xl font-bold text-white mb-2">{{ feature.title }}</h3>
      <p class="text-white/70">{{ feature.description }}</p>
    </div>
  </div>
</template>
```

### Pattern: Action Buttons

```vue
<template>
  <div class="flex gap-4">
    <button class="glass-button glass-button-primary">
      ✓ Confirmer
    </button>
    <button class="glass-button glass-button-secondary">
      ✕ Annuler
    </button>
  </div>
</template>

<style scoped>
.glass-button {
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
  cursor: pointer;
}

.glass-button-primary {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.4));
  color: white;
}

.glass-button-primary:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(59, 130, 246, 0.6));
  transform: translateY(-2px);
}

.glass-button-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.glass-button-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
```

---

## Performance Tips 🚀

1. **Évitez les animations simultanées** sur trop d'éléments
2. **Utilisez `will-change`** pour les animations fréquentes
3. **Limitez la profondeur des éléments** avec z-index
4. **Testez sur mobile** avant de déployer
5. **Utilisez `prefers-reduced-motion`** pour l'accessibilité

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

