<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden flex items-center justify-center p-6">
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
      <div class="glass-card-pinlock">
        <div class="text-center mb-12">
          <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </div>
          <p class="text-sm text-white/60 mb-3">Accès à l'application</p>
          <h1 class="text-3xl font-bold text-white mb-3">Code d'entrée familial</h1>
          <p class="text-white/60">Entrez le code pour accéder aux profils</p>
        </div>

        <div class="flex justify-center space-x-3 mb-12">
          <div
            v-for="(digit, index) in pinDigits"
            :key="index"
            class="w-14 h-14 border-2 border-white/30 rounded-xl flex items-center justify-center text-2xl font-bold transition-all"
            :class="{
              'bg-gradient-to-br from-purple-400/30 to-pink-400/30 border-purple-400/60 text-white': digit !== '',
              'text-white/40 bg-white/5': digit === ''
            }"
          >
            <span v-if="digit" class="text-white">●</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 mb-8">
          <button
            v-for="number in 9"
            :key="number"
            class="glass-button-pin h-12"
            @click="addDigit(number)"
          >
            {{ number }}
          </button>
          <button
            class="glass-button-pin h-12 col-start-2"
            @click="addDigit(0)"
          >
            0
          </button>
          <button
            class="glass-button-pin h-12 text-lg"
            title="Supprimer"
            @click="removeDigit"
          >
            ⌫
          </button>
        </div>

        <div v-if="errorMessage" class="text-center mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p class="text-red-300 text-sm">{{ errorMessage }}</p>
        </div>

        <div class="text-center pt-6 border-t border-white/10">
          <p class="text-sm text-white/60">Code oublié ? Demandez-le au parent.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '../services/apiService.js'
import familyGateService from '../services/familyGateService.js'

const MAX_ATTEMPTS = 5

export default {
  name: 'FamilyGate',
  data () {
    return {
      pinDigits: ['', '', '', ''],
      currentDigit: 0,
      errorMessage: '',
      attempts: 0,
      isLocked: false
    }
  },
  methods: {
    addDigit (digit) {
      if (this.isLocked) return
      if (this.currentDigit < 4) {
        this.pinDigits[this.currentDigit] = String(digit)
        this.currentDigit++
        if (this.currentDigit === 4) {
          this.checkCode()
        }
      }
    },
    removeDigit () {
      if (this.currentDigit > 0) {
        this.currentDigit--
        this.pinDigits[this.currentDigit] = ''
        this.errorMessage = ''
      }
    },
    async checkCode () {
      if (this.isLocked) return
      const pin = this.pinDigits.join('')
      try {
        const response = await apiService.request('/api/auth/family-gate', {
          method: 'POST',
          body: JSON.stringify({ pin })
        })
        if (response?.success && response?.data?.valid) {
          familyGateService.createFamilySession()
          this.$router.push('/')
        } else {
          this.failAttempt()
        }
      } catch (err) {
        const msg = err?.message || err?.data?.message || 'Code incorrect'
        this.attempts++
        if (this.attempts >= MAX_ATTEMPTS) {
          this.isLocked = true
          this.errorMessage = 'Trop de tentatives. Réessayez plus tard.'
        } else {
          this.errorMessage = `${msg}. Tentatives restantes : ${MAX_ATTEMPTS - this.attempts}`
          setTimeout(() => this.resetPin(), 1000)
        }
      }
    },
    failAttempt () {
      this.attempts++
      if (this.attempts >= MAX_ATTEMPTS) {
        this.isLocked = true
        this.errorMessage = 'Trop de tentatives. Réessayez plus tard.'
      } else {
        this.errorMessage = `Code incorrect. Tentatives restantes : ${MAX_ATTEMPTS - this.attempts}`
        setTimeout(() => this.resetPin(), 1000)
      }
    },
    resetPin () {
      this.pinDigits = ['', '', '', '']
      this.currentDigit = 0
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

.glass-button-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.glass-button-pin:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.glass-button-pin:active {
  transform: translateY(0);
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
