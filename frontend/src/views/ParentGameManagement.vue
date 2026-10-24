<template>
  <div class="min-h-screen overflow-hidden">
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center space-x-4">
          <button
            type="button"
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            title="Retour au dashboard"
            aria-label="Retour au tableau de bord"
            @click="goBack"
          >
            <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-white">Jeux</h1>
            <p class="text-sm text-white/70 hidden sm:block">Ouvrez les jeux à vos enfants, sous conditions</p>
          </div>
        </div>
      </nav>
    </header>

    <main class="relative z-10 container mx-auto px-6 py-10 max-w-5xl">
      <section class="glass-card-dashboard mb-8" aria-labelledby="games-how-title">
        <h2 id="games-how-title" class="text-lg font-bold text-white">Comment ça marche</h2>
        <ul class="text-white/80 text-sm space-y-1 list-disc pl-5">
          <li>Chaque jeu est <strong>fermé par défaut</strong> : vous l'ouvrez enfant par enfant.</li>
          <li>Une condition peut être exigée (quiz terminés, moyenne de la semaine, jours de suite) : elle est vérifiée par le serveur à partir des quiz réellement terminés.</li>
          <li>Le temps de jeu par jour ne compte que pendant une partie en cours ; la partie s'arrête quand il est écoulé.</li>
        </ul>
      </section>

      <div v-if="childrenError" class="glass-card-dashboard text-center py-10" role="alert">
        <p class="text-red-200 mb-4">{{ childrenError }}</p>
        <button type="button" class="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-xl" @click="loadChildren">Réessayer</button>
      </div>

      <p v-else-if="childrenLoaded && children.length === 0" class="glass-card-dashboard text-center text-white/80 py-10">
        Aucun profil enfant actif : créez d'abord un profil enfant ou adolescent.
      </p>

      <template v-else-if="children.length > 0">
        <div class="flex flex-wrap gap-3 mb-8" role="radiogroup" aria-label="Enfant">
          <button
            v-for="child in children"
            :key="child.id"
            type="button"
            role="radio"
            :aria-checked="String(child.id) === String(selectedChildId)"
            class="px-5 py-2.5 rounded-xl border font-medium transition-all"
            :class="String(child.id) === String(selectedChildId)
              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 border-transparent'
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'"
            @click="selectChild(child.id)"
          >
            {{ child.name }}
          </button>
        </div>

        <div v-if="isLoadingGames" class="text-center py-16" role="status">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4" aria-hidden="true"></div>
          <p class="text-white/70 text-lg">Chargement des jeux...</p>
        </div>

        <div v-else-if="gamesError" class="glass-card-dashboard text-center py-10" role="alert">
          <p class="text-red-200 mb-2">{{ gamesError }}</p>
          <p v-if="gamesErrorRef" class="text-xs text-white/70 mb-4">{{ gamesErrorRef }}</p>
          <button type="button" class="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-xl" @click="loadGames">Réessayer</button>
        </div>

        <div v-else class="grid lg:grid-cols-2 gap-6">
          <form
            v-for="game in games"
            :key="game.key"
            class="glass-card-dashboard"
            :aria-labelledby="`game-${game.key}-title`"
            @submit.prevent="saveRule(game)"
          >
            <div class="flex items-start gap-4">
              <span
                class="w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl flex-shrink-0"
                :class="display(game.key).gradient"
                aria-hidden="true"
              >{{ display(game.key).icon }}</span>
              <div class="flex-1 min-w-0">
                <h2 :id="`game-${game.key}-title`" class="text-xl font-bold text-white">{{ game.title }}</h2>
                <p class="text-sm mt-1" :class="game.access.unlocked ? 'text-green-200' : 'text-white/70'">
                  {{ statusText(game) }}
                </p>
                <p class="text-xs text-white/70 mt-1">
                  Joué aujourd'hui : {{ formatPlayTime(game.access.usedSecondsToday) }}<template v-if="game.bestScore > 0"> · record : {{ game.bestScore }}</template>
                </p>
              </div>
            </div>

            <label class="flex items-center justify-between gap-4 py-3 border-t border-white/10 cursor-pointer">
              <span class="text-white font-medium">Autoriser ce jeu à {{ selectedChildName }}</span>
              <input
                v-model="forms[game.key].isEnabled"
                type="checkbox"
                role="switch"
                class="game-switch"
              />
            </label>

            <fieldset class="space-y-3" :disabled="!forms[game.key].isEnabled">
              <legend class="sr-only">Conditions d'accès à {{ game.title }}</legend>
              <div class="grid sm:grid-cols-[minmax(0,1fr)_7rem] gap-3">
                <div>
                  <label :for="`game-${game.key}-condition`" class="block text-sm font-medium text-white/80 mb-1">Condition</label>
                  <select
                    :id="`game-${game.key}-condition`"
                    v-model="forms[game.key].conditionType"
                    class="game-field"
                    @change="onConditionChange(game.key)"
                  >
                    <option v-for="condition in conditionTypes" :key="condition.type" :value="condition.type" class="bg-slate-900">
                      {{ condition.label }}
                    </option>
                  </select>
                </div>
                <div v-if="conditionOf(game.key)?.type !== 'none'">
                  <label :for="`game-${game.key}-value`" class="block text-sm font-medium text-white/80 mb-1">
                    Objectif ({{ conditionOf(game.key)?.unit }})
                  </label>
                  <input
                    :id="`game-${game.key}-value`"
                    v-model.number="forms[game.key].conditionValue"
                    type="number"
                    :min="conditionOf(game.key)?.min"
                    :max="conditionOf(game.key)?.max"
                    required
                    class="game-field"
                    :aria-describedby="`game-${game.key}-value-hint`"
                  />
                  <p :id="`game-${game.key}-value-hint`" class="text-xs text-white/70 mt-1">
                    Entre {{ conditionOf(game.key)?.min }} et {{ conditionOf(game.key)?.max }}
                  </p>
                </div>
              </div>

              <div>
                <label :for="`game-${game.key}-limit`" class="block text-sm font-medium text-white/80 mb-1">Temps de jeu par jour</label>
                <select
                  :id="`game-${game.key}-limit`"
                  v-model="forms[game.key].dailyLimitMinutes"
                  class="game-field"
                >
                  <option v-for="minutes in limitOptions(game.key)" :key="String(minutes)" :value="minutes" class="bg-slate-900">
                    {{ minutes === null ? 'Sans limite' : `${minutes} minutes` }}
                  </option>
                </select>
              </div>
            </fieldset>

            <div class="flex flex-wrap justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                aria-haspopup="dialog"
                @click="openPreview(game)"
              >
                Essayer
              </button>
              <button
                type="submit"
                class="px-5 py-2 rounded-xl font-semibold text-slate-900 bg-gradient-to-r from-yellow-300 to-amber-400 disabled:opacity-50"
                :disabled="savingKey === game.key || !isDirty(game)"
              >
                {{ savingKey === game.key ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </template>
    </main>

    <!-- Essai d'un jeu par le parent : rien n'est enregistré -->
    <BaseModal
      :open="!!previewGame"
      labelledby="game-preview-title"
      overlay-class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      panel-class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl w-full max-w-3xl p-4 sm:p-6 border border-white/10 max-h-[95vh] overflow-y-auto"
      @close="previewGame = null"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 id="game-preview-title" class="text-xl font-bold text-white">Essai : {{ previewGame?.title }}</h2>
        <button
          type="button"
          class="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          aria-label="Fermer l'essai"
          @click="previewGame = null"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <component :is="display(previewGame.key).component" v-if="previewGame" />
    </BaseModal>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import BaseModal from '../components/BaseModal.vue'
import { useProfileStore } from '../stores/profileStore.js'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { useToast } from '../stores/toastStore.js'
import { getGames, saveGameRule } from '../services/gameService.js'
import { gameDisplay, formatPlayTime, DAILY_LIMIT_PRESETS } from '../games/catalog.js'
import { describeError } from '../utils/apiErrors.js'

const ruleToForm = rule => ({
  isEnabled: rule.isEnabled === true,
  conditionType: rule.conditionType || 'none',
  conditionValue: rule.conditionValue || 0,
  dailyLimitMinutes: rule.dailyLimitMinutes ?? null
})

export default {
  name: 'ParentGameManagement',
  components: { BaseModal },
  setup() {
    const profileStore = useProfileStore()
    const parentNav = useParentNavigation()
    const toast = useToast()

    const children = ref([])
    const childrenLoaded = ref(false)
    const childrenError = ref('')
    const selectedChildId = ref(null)

    const games = ref([])
    const conditionTypes = ref([])
    const forms = reactive({})
    const isLoadingGames = ref(false)
    const gamesError = ref('')
    const gamesErrorRef = ref(null)
    const savingKey = ref(null)
    const previewGame = ref(null)

    const selectedChildName = computed(() =>
      children.value.find(child => String(child.id) === String(selectedChildId.value))?.name || 'cet enfant')

    const conditionOf = key => conditionTypes.value.find(condition => condition.type === forms[key]?.conditionType)

    function setGames (list) {
      games.value = list
      for (const game of list) forms[game.key] = ruleToForm(game.rule)
    }

    async function loadGames () {
      if (!selectedChildId.value) return
      isLoadingGames.value = true
      gamesError.value = ''
      gamesErrorRef.value = null
      try {
        const data = await getGames(selectedChildId.value)
        conditionTypes.value = data.conditionTypes
        setGames(data.games)
      } catch (error) {
        console.error('Erreur lors du chargement des jeux:', error)
        const { message, requestId } = describeError(error, 'Impossible de charger les jeux.')
        gamesError.value = message
        gamesErrorRef.value = requestId ? `Réf. ${requestId}` : null
        games.value = []
      } finally {
        isLoadingGames.value = false
      }
    }

    async function loadChildren () {
      childrenError.value = ''
      try {
        await profileStore.loadProfiles()
        children.value = profileStore.nonAdminProfiles || []
        childrenLoaded.value = true
        if (children.value.length > 0 && !selectedChildId.value) {
          selectedChildId.value = children.value[0].id
          await loadGames()
        }
      } catch (error) {
        console.error('Erreur lors du chargement des profils:', error)
        childrenError.value = describeError(error, 'Impossible de charger les profils.').message
      }
    }

    function selectChild (id) {
      if (String(id) === String(selectedChildId.value)) return
      selectedChildId.value = id
      loadGames()
    }

    // Nouvelle condition : objectif par défaut si l'actuel sort des bornes
    function onConditionChange (key) {
      const condition = conditionOf(key)
      if (!condition) return
      const value = Number(forms[key].conditionValue)
      if (condition.type === 'none') {
        forms[key].conditionValue = 0
      } else if (!Number.isInteger(value) || value < condition.min || value > condition.max) {
        forms[key].conditionValue = condition.defaultValue
      }
    }

    // Durées proposées, plus la durée enregistrée si elle n'en fait pas partie
    function limitOptions (key) {
      const current = games.value.find(game => game.key === key)?.rule.dailyLimitMinutes ?? null
      return DAILY_LIMIT_PRESETS.includes(current)
        ? DAILY_LIMIT_PRESETS
        : [...DAILY_LIMIT_PRESETS, current].sort((a, b) => (a ?? -1) - (b ?? -1))
    }

    function isDirty (game) {
      const form = forms[game.key]
      if (!form) return false
      const saved = ruleToForm(game.rule)
      return form.isEnabled !== saved.isEnabled ||
        form.conditionType !== saved.conditionType ||
        (form.conditionType !== 'none' && Number(form.conditionValue) !== saved.conditionValue) ||
        form.dailyLimitMinutes !== saved.dailyLimitMinutes
    }

    function statusText (game) {
      const { access } = game
      if (!game.rule.isEnabled) return 'Fermé pour cet enfant.'
      if (access.unlocked) {
        return access.remainingSeconds === null
          ? 'Accessible maintenant, sans limite de temps.'
          : `Accessible maintenant : ${formatPlayTime(access.remainingSeconds)} restantes aujourd'hui.`
      }
      if (access.reason === 'condition') {
        return `Verrouillé : ${access.condition.label.toLowerCase()} (${access.condition.current} / ${access.condition.target}).`
      }
      if (access.reason === 'time_limit') return 'Temps de jeu du jour écoulé.'
      return access.message || 'Verrouillé.'
    }

    async function saveRule (game) {
      const childId = selectedChildId.value
      savingKey.value = game.key
      try {
        const updated = await saveGameRule(childId, game.key, forms[game.key])
        // L'enfant a pu changer pendant l'enregistrement : ne pas mélanger les règles
        if (updated && String(childId) === String(selectedChildId.value)) {
          setGames(games.value.map(item => (item.key === updated.key ? updated : item)))
        }
        toast.success(`${game.title} : règle enregistrée pour ${selectedChildName.value}`)
      } catch (error) {
        toast.errorFrom(error, 'Erreur lors de l\'enregistrement de la règle')
      } finally {
        savingKey.value = null
      }
    }

    function openPreview (game) {
      previewGame.value = game
    }

    function goBack () {
      parentNav.goToDashboard()
    }

    onMounted(loadChildren)

    return {
      children,
      childrenLoaded,
      childrenError,
      selectedChildId,
      selectedChildName,
      games,
      conditionTypes,
      forms,
      isLoadingGames,
      gamesError,
      gamesErrorRef,
      savingKey,
      previewGame,
      display: gameDisplay,
      formatPlayTime,
      conditionOf,
      loadChildren,
      loadGames,
      selectChild,
      onConditionChange,
      limitOptions,
      isDirty,
      statusText,
      saveRule,
      openPreview,
      goBack
    }
  }
}
</script>

<style scoped>
.game-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.game-field:focus {
  outline: none;
  box-shadow: 0 0 0 2px #f59e0b;
}

fieldset:disabled {
  opacity: 0.5;
}

/* Interrupteur (case à cocher role="switch") */
.game-switch {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  width: 3rem;
  height: 1.75rem;
  flex-shrink: 0;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: background 0.2s ease;
}

.game-switch::after {
  content: '';
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.game-switch:checked {
  background: #22c55e;
}

.game-switch:checked::after {
  transform: translateX(1.25rem);
}

.game-switch:focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 2px;
}
</style>
