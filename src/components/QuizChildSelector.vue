<template>
  <div class="glass-card-dashboard mb-12">
    <h2 class="text-xl font-bold text-white mb-4">Sélectionner un enfant</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <button
        v-for="child in children"
        :key="child.id"
        :class="[
          'p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-2',
          modelValue?.id === child.id
            ? 'border-purple-400 bg-white/20'
            : 'border-white/20 hover:border-white/40 hover:bg-white/10'
        ]"
        @click="$emit('update:modelValue', child)"
      >
        <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="child.bgColor">
          <span class="text-white font-bold text-lg">{{ child.initial }}</span>
        </div>
        <p class="font-medium text-white text-sm text-center truncate">{{ child.name }}</p>
        <p class="text-white/60 text-xs">{{ child.totalQuizzes || 0 }} quiz</p>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuizChildSelector',
  props: {
    children: {
      type: Array,
      required: true
    },
    modelValue: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue']
}
</script>
