<template>
  <div class="min-h-screen overflow-hidden flex items-center justify-center p-6">
    <div class="relative z-10 w-full max-w-md">
      <div class="glass-card-pinlock">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </div>
          <p class="text-sm text-white/70 mb-3">Accès à l'application</p>
          <h1 class="text-3xl font-bold text-white mb-3">Code d'entrée familial</h1>
          <p class="text-white/70">Entrez le code pour accéder aux profils</p>
        </div>

        <PinPad
          v-model="code"
          label="Code d'entrée familial"
          testid-prefix="family-gate"
          :disabled="isLocked || isChecking"
          @submit="checkCode"
        />

        <p v-if="isChecking" class="text-center mt-6 text-white/70 text-sm" role="status">Vérification…</p>

        <!-- Code incorrect / erreur serveur : annoncé immédiatement -->
        <div v-if="errorMessage && !isLocked" class="text-center mt-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30" role="alert">
          <p class="text-red-300 text-sm">{{ errorMessage }}</p>
        </div>

        <!-- Verrouillage : compte à rebours visible (role="timer" : pas d'annonce à chaque seconde) -->
        <div v-if="errorMessage && isLocked" class="text-center mt-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30" role="timer" aria-live="off">
          <p class="text-red-300 text-sm">{{ errorMessage }}</p>
        </div>
        <!-- … annoncé une seule fois au début du blocage -->
        <p v-if="isLocked && lockAnnouncement" class="sr-only" role="alert">{{ lockAnnouncement }}</p>

        <div class="text-center pt-6 mt-8 border-t border-white/10">
          <p class="text-sm text-white/70">Code oublié ? Demandez-le au parent.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatWaitDelay } from '../services/apiService.js'
import { authService } from '../services/authService.js'
import familyGateService from '../services/familyGateService.js'
import PinPad from '../components/PinPad.vue'

export default {
  name: 'FamilyGate',
  components: { PinPad },
  data () {
    return {
      code: '',
      errorMessage: '',
      isLocked: false,
      isChecking: false,
      unlockTimer: null,
      // Annonce unique du blocage pour les lecteurs d'écran (le compte à rebours n'est pas relu)
      lockAnnouncement: ''
    }
  },
  beforeUnmount () {
    if (this.unlockTimer) clearInterval(this.unlockTimer)
  },
  methods: {
    async checkCode () {
      if (this.isLocked || this.isChecking) return
      const pin = this.code
      this.isChecking = true
      this.errorMessage = ''
      try {
        const response = await authService.checkFamilyCode(pin)
        // Le serveur renvoie un jeton famille (~24 h) à présenter sur chaque appel API
        if (response?.success && response?.data?.valid && familyGateService.createFamilySession(response.data)) {
          this.$router.push(this.redirectTarget())
        } else {
          this.failAttempt()
        }
      } catch (err) {
        if (err?.status === 429) {
          // FAMILY_GATE_LOCKED : verrouillage décidé par le serveur
          this.lockFor(err.retryAfterSeconds || 60)
        } else if (err?.status === 401) {
          // INVALID_CREDENTIALS
          this.failAttempt()
        } else {
          // 503 FAMILY_GATE_NOT_CONFIGURED, serveur injoignable… : message du serveur
          this.errorMessage = err?.message || 'Erreur de connexion. Veuillez réessayer.'
          this.resetCode()
        }
      } finally {
        this.isChecking = false
      }
    },
    // Page demandée avant le code familial (chemin interne uniquement)
    redirectTarget () {
      const target = this.$route.query.redirect
      if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/family-gate')) {
        return target
      }
      return '/'
    },
    failAttempt () {
      // Le serveur compte les essais et verrouille si besoin (429)
      this.errorMessage = 'Code incorrect. Vérifiez-le et réessayez.'
      this.resetCode()
    },
    lockFor (seconds) {
      this.isLocked = true
      this.resetCode()
      if (this.unlockTimer) clearInterval(this.unlockTimer)
      const lockedUntil = Date.now() + seconds * 1000
      const update = () => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
        if (remaining <= 0) {
          clearInterval(this.unlockTimer)
          this.unlockTimer = null
          this.isLocked = false
          this.errorMessage = ''
          this.lockAnnouncement = ''
          return
        }
        this.errorMessage = `Trop de codes incorrects : l'accès est temporairement bloqué. Réessayez dans ${formatWaitDelay(remaining)}.`
      }
      update()
      this.lockAnnouncement = this.isLocked ? this.errorMessage : ''
      this.unlockTimer = setInterval(update, 1000)
    },
    resetCode () {
      this.code = ''
    }
  }
}
</script>

<style scoped>
.glass-card-pinlock {
  padding: 2rem;
  border-radius: 2rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

@media (max-width: 640px) {
  .glass-card-pinlock {
    padding: 1.5rem;
    border-radius: 1.5rem;
  }
  h1 {
    font-size: 1.75rem;
  }
}
</style>
