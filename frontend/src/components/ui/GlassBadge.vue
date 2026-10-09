<template>
  <div class="lg-glass-badge" :class="[gradientClass, sizeClass, customClass]">
    <span v-if="icon" class="text-sm">{{ icon }}</span>
    <span>{{ text }}</span>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Texte du badge
  text: {
    type: String,
    required: true
  },
  // Icône emoji
  icon: {
    type: String,
    default: ''
  },
  // Gradient de couleur
  gradient: {
    type: String,
    default: 'primary',
    validator: (value) => [
      'primary', 'secondary', 'profiles', 'learning', 
      'quiz', 'activities', 'lessons', 'notifications', 'info'
    ].includes(value)
  },
  // Taille du badge
  size: {
    type: String,
    default: 'normal',
    validator: (value) => ['small', 'normal', 'large'].includes(value)
  },
  // Classes CSS personnalisées
  customClass: {
    type: String,
    default: ''
  }
})

const gradientClass = computed(() => {
  const gradients = {
    primary: 'lg-gradient-primary',
    secondary: 'lg-gradient-secondary',
    profiles: 'lg-gradient-profiles',
    learning: 'lg-gradient-learning',
    quiz: 'lg-gradient-quiz',
    activities: 'lg-gradient-activities',
    lessons: 'lg-gradient-lessons',
    notifications: 'lg-gradient-notifications',
    info: 'lg-gradient-info'
  }
  return gradients[props.gradient]
})

const sizeClass = computed(() => {
  const sizes = {
    small: 'px-2 py-1 text-xs',
    normal: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base'
  }
  return sizes[props.size]
})
</script>

<style scoped>
/* Styles spécifiques au composant si nécessaire */
</style>
