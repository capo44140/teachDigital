<template>
  <div v-if="visible" class="mt-6 bg-white/10 backdrop-blur-xl rounded-2xl p-6">
    <!-- Barre de progression globale -->
    <div class="mb-5">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-white/80">Progression globale</span>
        <span class="text-sm font-bold text-purple-300">{{ progressPercent }}%</span>
      </div>
      <div class="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
        <div
          class="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-700 ease-out"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
    </div>

    <!-- Liste des étapes -->
    <div class="space-y-3">
      <div
        v-for="step in steps"
        :key="step.id"
        :class="[
          'flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-500',
          step.status === 'active' ? 'bg-purple-500/15 border border-purple-400/30' : '',
          step.status === 'done' ? 'bg-green-500/10' : '',
          step.status === 'error' ? 'bg-red-500/10' : '',
          step.status === 'pending' ? 'opacity-40' : ''
        ]"
      >
        <!-- Icône de statut -->
        <div class="flex-shrink-0 mt-0.5">
          <!-- Pending -->
          <div v-if="step.status === 'pending'" class="w-6 h-6 rounded-full border-2 border-white/20"></div>
          <!-- Active (spinner) -->
          <svg v-else-if="step.status === 'active'" class="w-6 h-6 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <!-- Done (check) -->
          <div v-else-if="step.status === 'done'" class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <!-- Error (cross) -->
          <div v-else-if="step.status === 'error'" class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
        </div>

        <!-- Contenu de l'étape -->
        <div class="flex-1 min-w-0">
          <p :class="[
            'text-sm font-medium',
            step.status === 'active' ? 'text-white' : '',
            step.status === 'done' ? 'text-green-300' : '',
            step.status === 'error' ? 'text-red-300' : '',
            step.status === 'pending' ? 'text-white/60' : ''
          ]">{{ step.label }}</p>
          <p v-if="step.detail" :class="[
            'text-xs mt-0.5',
            step.status === 'error' ? 'text-red-200/70' : 'text-white/40'
          ]">{{ step.detail }}</p>
        </div>

        <!-- Durée -->
        <span v-if="step.duration" class="text-xs text-white/30 flex-shrink-0 mt-0.5">
          {{ step.duration }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LessonScannerProgressStepper',
  props: {
    steps: {
      type: Array,
      required: true
    },
    visible: {
      type: Boolean,
      default: false
    },
    progressPercent: {
      type: Number,
      default: 0
    }
  }
}
</script>
