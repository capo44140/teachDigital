<template>
  <section class="glass-card-dashboard" aria-labelledby="install-app-title">
    <h2 id="install-app-title" class="text-xl font-bold text-white mb-2 flex items-center">
      <svg class="w-6 h-6 text-emerald-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      Installer l'application
    </h2>

    <p v-if="state.isInstalled" class="text-white/70">
      TeachDigital est installée sur cet appareil : ouvrez-la depuis l'écran d'accueil.
    </p>

    <template v-else>
      <p class="text-white/70">
        Ajoutez TeachDigital à l'écran d'accueil pour l'ouvrir comme une application, en plein écran.
      </p>

      <div v-if="state.canPrompt" class="mt-4">
        <button
          type="button"
          class="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/40 transition-all disabled:opacity-60"
          :disabled="isPrompting"
          @click="install"
        >
          {{ isPrompting ? 'Installation…' : 'Installer TeachDigital' }}
        </button>
      </div>

      <div v-else class="mt-4">
        <h3 class="text-sm font-semibold text-white/80 mb-2">{{ guide.browser }}</h3>
        <ol class="list-decimal list-inside space-y-1 text-sm text-white/70">
          <li v-for="step in guide.steps" :key="step">{{ step }}</li>
        </ol>
      </div>

      <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
    </template>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getInstallGuide, installState as state, promptInstall, registerInstallUi } from '../services/installService.js'

const isPrompting = ref(false)
const statusMessage = ref('')
const guide = getInstallGuide()
let releaseUi = null

onMounted(() => {
  releaseUi = registerInstallUi()
})

onBeforeUnmount(() => {
  if (releaseUi) releaseUi()
})

async function install () {
  isPrompting.value = true
  statusMessage.value = ''
  try {
    const outcome = await promptInstall()
    statusMessage.value = outcome === 'accepted'
      ? 'Installation lancée.'
      : 'Installation annulée.'
  } catch (error) {
    console.warn('Installation impossible:', error)
    statusMessage.value = 'Installation impossible depuis ce navigateur.'
  } finally {
    isPrompting.value = false
  }
}
</script>
