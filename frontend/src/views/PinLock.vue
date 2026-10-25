<template>
  <div class="min-h-screen overflow-hidden flex items-center justify-center p-6">
    <!-- Contenu relatif -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Bouton de fermeture -->
      <div class="flex justify-end mb-8">
        <button
          type="button"
          class="p-3 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
          title="Retour"
          aria-label="Retour"
          @click="goBack"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Glass card principale -->
      <div class="glass-card-pinlock">
        <!-- Message d'état -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <p class="text-sm text-white/70 mb-3">Accès sécurisé</p>
          <h1 class="text-3xl font-bold text-white mb-3">Entrez votre PIN</h1>
          <p class="text-white/70">Profil: <span class="font-semibold text-white">{{ profileName }}</span></p>
        </div>

        <!-- Saisie du PIN (4 à 8 chiffres) -->
        <PinPad
          v-model="pin"
          :label="`Code PIN du profil ${profileName}`"
          testid-prefix="pin-lock"
          :disabled="isLocked || isChecking"
          @submit="checkPin"
        />

        <!-- Vérification en cours -->
        <div v-if="isChecking" class="text-center mt-6" role="status">
          <p class="text-white/70 text-sm">Vérification…</p>
        </div>

        <!-- Message d'erreur (PIN incorrect : message du serveur), annoncé immédiatement -->
        <div v-if="errorMessage && !isLocked" class="text-center mt-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30" role="alert">
          <p class="text-red-300 text-sm">{{ errorMessage }}</p>
        </div>

        <!-- Verrouillage : compte à rebours visible (role="timer" : pas d'annonce à chaque seconde) -->
        <div v-if="errorMessage && isLocked" class="text-center mt-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30" role="timer" aria-live="off">
          <p class="text-red-300 text-sm">{{ errorMessage }}</p>
        </div>
        <!-- … annoncé une seule fois au début du blocage -->
        <p v-if="isLocked && lockAnnouncement" class="sr-only" role="alert">{{ lockAnnouncement }}</p>

        <!-- Lien mot de passe oublié -->
        <div class="text-center pt-6 mt-8 border-t border-white/10">
          <button
            type="button"
            class="text-sm text-white/70 hover:text-white transition-colors"
            :aria-expanded="showForgotHelp ? 'true' : 'false'"
            aria-controls="pin-lock-forgot-help"
            @click="forgotPin"
          >
            Vous avez oublié votre code PIN ?
          </button>
          <p v-if="showForgotHelp" id="pin-lock-forgot-help" class="mt-3 text-sm text-white/70">
            {{ forgotPinMessage }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { PIN_CONFIG } from '../config/pinConfig.js'
import { useProfileStore } from '../stores/profileStore.js'
import { formatWaitDelay } from '../services/apiService.js'
import { authService } from '../services/authService.js'
import { hasParentAccess } from '../services/parentAccessService.js'
import PinPad from '../components/PinPad.vue'

// Verrouillage décidé par le serveur (429 PIN_LOCKED, progressif : 15 min → 1 h → 24 h).
// Le compte à rebours n'est qu'informatif et reste en mémoire : après un rechargement,
// le serveur répond de nouveau 429 avec le délai restant (ou accepte l'essai si le
// verrouillage a été levé, par exemple par un redémarrage du backend).
const LOCK_LABELS = {
  RATE_LIMIT_LOGIN: 'Trop de tentatives de connexion.',
  default: 'Trop de codes incorrects : l\'accès est temporairement bloqué.'
}

export default {
  name: 'PinLock',
  components: { PinPad },
  props: {
    profileName: {
      type: String,
      default: 'Parent'
    }
  },
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      pin: '',
      errorMessage: '',
      isLocked: false,
      isChecking: false,
      lockoutTimer: null,
      // Annonce unique du blocage pour les lecteurs d'écran (le compte à rebours n'est pas relu)
      lockAnnouncement: '',
      showForgotHelp: false,
      forgotPinMessage: PIN_CONFIG.MESSAGES.FORGOT_PIN
    }
  },
  computed: {
    targetProfileId() {
      const fromRoute = this.$route.query.profile
      if (fromRoute) return String(fromRoute)
      const selected = this.profileStore.selectedProfile
      return selected?.is_admin ? String(selected.id) : null
    }
  },
  mounted() {
    if (!this.targetProfileId) {
      this.$router.replace('/')
      return
    }
    // Session parent encore valide : inutile de redemander le PIN
    if (hasParentAccess(this.targetProfileId)) {
      this.$router.replace({ path: '/dashboard', query: { profile: this.targetProfileId } })
    }
  },
  beforeUnmount() {
    this.stopLockoutTimer()
  },
  methods: {
    async checkPin() {
      if (this.isLocked || this.isChecking) return

      const profileId = this.targetProfileId
      if (!profileId) {
        this.$router.replace('/')
        return
      }
      const enteredPin = this.pin
      if (!enteredPin) return
      this.isChecking = true
      this.errorMessage = ''

      try {
        // Vérification unique : le serveur contrôle le PIN et délivre le jeton parent.
        // La session parent n'est ouverte qu'en cas de succès.
        const data = await authService.login(Number(profileId), enteredPin)

        if (data?.profile?.isAdmin !== true || !hasParentAccess(profileId)) {
          await authService.logout()
          this.errorMessage = 'Ce profil n\'a pas accès à l\'espace parent.'
          this.resetPin()
          return
        }

        this.profileStore.setSelectedProfile({
          id: data.profile.id ?? profileId,
          name: data.profile.name || this.profileName,
          type: data.profile.type,
          is_admin: true
        })

        this.$router.push({ path: '/dashboard', query: { profile: profileId } }).catch(error => {
          console.error('Erreur lors de la redirection:', error)
          // Fallback vers le sélecteur de profil
          this.$router.push('/')
        })
      } catch (error) {
        if (error?.code === 'SESSION_EXPIRED') {
          // Session famille expirée ou révoquée : le router renvoie au code familial
          this.errorMessage = error.message
          this.resetPin()
        } else if (error?.status === 401) {
          // INVALID_CREDENTIALS : PIN incorrect (le serveur compte les essais).
          // Saisie effacée tout de suite : rien ne doit effacer la saisie suivante.
          this.errorMessage = error.message || PIN_CONFIG.MESSAGES.INCORRECT_PIN
          this.resetPin()
        } else if (error?.status === 429) {
          // PIN_LOCKED (progressif) ou RATE_LIMIT_LOGIN : verrouillage décidé par le serveur
          this.startLockout(error.retryAfterSeconds || 60, error.code)
        } else {
          console.error('Erreur lors de la vérification du PIN:', error)
          this.errorMessage = error?.message || 'Erreur de connexion. Veuillez réessayer.'
          this.resetPin()
        }
      } finally {
        this.isChecking = false
      }
    },

    startLockout(seconds, code = null) {
      this.runLockoutCountdown(Date.now() + seconds * 1000, code)
    },

    runLockoutCountdown(lockedUntil, code = null) {
      this.stopLockoutTimer()
      this.isLocked = true
      this.resetPin()
      const label = LOCK_LABELS[code] || LOCK_LABELS.default

      const update = () => {
        const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
        if (remaining <= 0) {
          this.stopLockoutTimer()
          this.isLocked = false
          this.errorMessage = ''
          this.lockAnnouncement = ''
          return
        }
        this.errorMessage = `${label} Réessayez dans ${formatWaitDelay(remaining)}.`
      }

      update()
      this.lockAnnouncement = this.isLocked ? this.errorMessage : ''
      if (this.isLocked) {
        this.lockoutTimer = setInterval(update, 1000)
      }
    },

    stopLockoutTimer() {
      if (this.lockoutTimer) {
        clearInterval(this.lockoutTimer)
        this.lockoutTimer = null
      }
    },

    resetPin() {
      this.pin = ''
    },

    goBack() {
      this.$router.push('/')
    },

    forgotPin() {
      // Aucun code n'est révélé : seul un adulte peut réinitialiser le PIN côté serveur
      this.showForgotHelp = !this.showForgotHelp
    }
  }
}
</script>

<style scoped>
/* Glass Card PIN Lock */
.glass-card-pinlock {
  padding: 2rem;
  border-radius: calc(2rem * var(--td-radius-scale, 1));
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (max-width: 640px) {
  .glass-card-pinlock {
    padding: 1.5rem;
    border-radius: calc(1.5rem * var(--td-radius-scale, 1));
  }

  h1 {
    font-size: 1.75rem;
  }
}
</style>
