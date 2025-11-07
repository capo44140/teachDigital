<template>
  <div class="lg-glass-progress-container">
    <div v-if="label" class="flex justify-between items-center mb-2">
      <span class="lg-text-primary font-medium">{{ label }}</span>
      <span class="lg-text-secondary text-sm">{{ displayValue }}</span>
    </div>
    <div class="lg-glass-progress">
      <div 
        class="lg-glass-progress-bar"
        :style="{ width: `${percentage}%` }"
      ></div>
    </div>
    <div v-if="description" class="mt-2">
      <span class="lg-text-muted text-sm">{{ description }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Valeur actuelle
  value: {
    type: Number,
    required: true
  },
  // Valeur maximale
  max: {
    type: Number,
    default: 100
  },
  // Label du progress
  label: {
    type: String,
    default: ''
  },
  // Description du progress
  description: {
    type: String,
    default: ''
  },
  // Format d'affichage de la valeur
  valueFormat: {
    type: String,
    default: 'percentage', // 'percentage', 'fraction', 'custom'
    validator: (value) => ['percentage', 'fraction', 'custom'].includes(value)
  },
  // Texte personnalisé pour la valeur
  customValue: {
    type: String,
    default: ''
  }
})

const percentage = computed(() => {
  return Math.min(Math.max((props.value / props.max) * 100, 0), 100)
})

const displayValue = computed(() => {
  if (props.valueFormat === 'custom' && props.customValue) {
    return props.customValue
  }
  
  if (props.valueFormat === 'fraction') {
    return `${props.value}/${props.max}`
  }
  
  return `${Math.round(percentage.value)}%`
})
</script>

<style scoped>
.lg-glass-progress-container {
  width: 100%;
}
</style>
