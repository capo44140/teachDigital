<template>
  <div class="lg-glass-toggle-container">
    <div 
      :class="[
        'lg-glass-toggle',
        modelValue ? 'active' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @click="toggle"
    >
      <div class="lg-glass-toggle-slider"></div>
    </div>
    <div v-if="label" class="ml-3">
      <div class="lg-text-primary font-medium">{{ label }}</div>
      <div v-if="description" class="lg-text-secondary text-sm">{{ description }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Valeur du toggle
  modelValue: {
    type: Boolean,
    default: false
  },
  // Label du toggle
  label: {
    type: String,
    default: ''
  },
  // Description du toggle
  description: {
    type: String,
    default: ''
  },
  // État désactivé
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const toggle = () => {
  if (!props.disabled) {
    const newValue = !props.modelValue
    emit('update:modelValue', newValue)
    emit('change', newValue)
  }
}
</script>

<style scoped>
.lg-glass-toggle-container {
  display: flex;
  align-items: center;
}
</style>
