<template>
  <div 
    :class="[
      'lg-glass-card',
      hoverable ? 'hover:lg-glass-card:hover' : '',
      sizeClass,
      customClass
    ]"
    :style="customStyle"
    @click="handleClick"
  >
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Taille de la carte
  size: {
    type: String,
    default: 'normal',
    validator: (value) => ['small', 'normal', 'large'].includes(value)
  },
  // Effet hover activé
  hoverable: {
    type: Boolean,
    default: true
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

const sizeClass = computed(() => {
  const sizes = {
    small: 'p-3 rounded-xl',
    normal: 'p-6 rounded-2xl',
    large: 'p-8 rounded-3xl'
  }
  return sizes[props.size]
})

const handleClick = (event) => {
  emit('click', event)
}
</script>

<style scoped>
/* Styles spécifiques au composant si nécessaire */
</style>
