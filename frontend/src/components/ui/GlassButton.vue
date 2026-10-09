<template>
  <button
    :class="[
      'lg-glass-button',
      gradientClass,
      sizeClass,
      disabled ? 'opacity-50 cursor-not-allowed' : '',
      customClass
    ]"
    :style="customStyle"
    :disabled="disabled"
    @click="handleClick"
  >
    <div v-if="icon" class="flex items-center gap-2">
      <span class="text-lg">{{ icon }}</span>
      <span>{{ title }}</span>
    </div>
    <span v-else>{{ title }}</span>
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Titre du bouton
  title: {
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
  // Taille du bouton
  size: {
    type: String,
    default: 'normal',
    validator: (value) => ['small', 'normal', 'large'].includes(value)
  },
  // État désactivé
  disabled: {
    type: Boolean,
    default: false
  },
  // Classes CSS personnalisées
  customClass: {
    type: String,
    default: ''
  },
  // Styles personnalisés
  customStyle: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['click'])

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
    small: 'px-3 py-2 text-sm',
    normal: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  }
  return sizes[props.size]
})

const handleClick = (event) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<style scoped>
/* Styles spécifiques au composant si nécessaire */
</style>
