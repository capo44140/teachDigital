<template>
  <div class="pin-pad">
    <label :for="inputId" class="sr-only">{{ label }}</label>
    <input
      :id="inputId"
      ref="inputEl"
      class="pin-pad__input"
      type="password"
      inputmode="numeric"
      pattern="[0-9]*"
      autocomplete="off"
      :minlength="minLength"
      :maxlength="maxLength"
      :value="modelValue"
      :disabled="disabled"
      :aria-describedby="hintId"
      :data-testid="testidPrefix ? `${testidPrefix}-input` : undefined"
      @input="onInput"
      @keydown.enter.prevent="submit"
    >
    <p :id="hintId" class="pin-pad__hint">
      {{ minLength }} à {{ maxLength }} chiffres, puis « Valider »
    </p>

    <!-- Nom du groupe distinct de celui du champ : getByLabel(label) ne désigne que le champ -->
    <div class="pin-pad__keys" role="group" aria-label="Pavé numérique">
      <button
        v-for="number in 9"
        :key="number"
        type="button"
        class="pin-pad__key"
        :disabled="disabled || isFull"
        :data-testid="testidPrefix ? `${testidPrefix}-digit-${number}` : undefined"
        @click="addDigit(number)"
      >
        {{ number }}
      </button>
      <button
        type="button"
        class="pin-pad__key pin-pad__key--secondary"
        :disabled="disabled || modelValue.length === 0"
        aria-label="Effacer le dernier chiffre"
        title="Effacer"
        @click="removeDigit"
      >
        <span aria-hidden="true">⌫</span>
      </button>
      <button
        type="button"
        class="pin-pad__key"
        :disabled="disabled || isFull"
        :data-testid="testidPrefix ? `${testidPrefix}-digit-0` : undefined"
        @click="addDigit(0)"
      >
        0
      </button>
      <button
        type="button"
        class="pin-pad__key pin-pad__key--submit"
        :disabled="disabled || !canSubmit"
        :data-testid="testidPrefix ? `${testidPrefix}-submit` : undefined"
        @click="submit"
      >
        {{ submitLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH, sanitizePinInput } from '../utils/pinPolicy.js'

/**
 * Saisie d'un code (PIN parent ou code familial) : 4 à 8 chiffres.
 * Clavier tactile + champ réel (clavier physique, lecteurs d'écran, Entrée pour valider).
 * Envoi automatique quand la longueur maximale est atteinte.
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Code PIN' },
  minLength: { type: Number, default: PIN_MIN_LENGTH },
  maxLength: { type: Number, default: PIN_MAX_LENGTH },
  disabled: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Valider' },
  // Préfixe des data-testid (tests E2E)
  testidPrefix: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'submit'])

// Identifiants uniques (label for / aria-describedby)
const instanceId = `pin-pad-${Math.random().toString(36).slice(2, 10)}`
const inputId = `${instanceId}-input`
const hintId = `${instanceId}-hint`
const inputEl = ref(null)

const isFull = computed(() => props.modelValue.length >= props.maxLength)
const canSubmit = computed(() => props.modelValue.length >= props.minLength)

function update (value) {
  const next = sanitizePinInput(value).slice(0, props.maxLength)
  emit('update:modelValue', next)
  if (next.length === props.maxLength) {
    emit('submit', next)
  }
}

function onInput (event) {
  const clean = sanitizePinInput(event.target.value).slice(0, props.maxLength)
  // Garder le champ synchronisé (caractères non numériques retirés)
  if (event.target.value !== clean) event.target.value = clean
  update(clean)
}

function addDigit (digit) {
  if (props.disabled || isFull.value) return
  update(`${props.modelValue}${digit}`)
}

function removeDigit () {
  if (props.disabled) return
  emit('update:modelValue', props.modelValue.slice(0, -1))
}

function submit () {
  if (props.disabled || !canSubmit.value) return
  emit('submit', props.modelValue)
}

function focus () {
  inputEl.value?.focus()
}

onMounted(() => {
  // Focus automatique seulement avec un pointeur précis (évite d'ouvrir le clavier virtuel)
  try {
    if (window.matchMedia('(pointer: fine)').matches) focus()
  } catch {
    // matchMedia indisponible : pas de focus automatique
  }
})

defineExpose({ focus })
</script>

<style scoped>
.pin-pad__input {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.5em;
  text-align: center;
}

.pin-pad__input:focus {
  outline: none;
  border-color: rgba(192, 132, 252, 0.9);
  box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.35);
}

.pin-pad__hint {
  margin: 0.5rem 0 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75);
}

.pin-pad__keys {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.pin-pad__key {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: background 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
}

.pin-pad__key:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.3);
}

.pin-pad__key:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pin-pad__key--secondary {
  font-size: 1.25rem;
}

.pin-pad__key--submit {
  background: linear-gradient(to right, #a855f7, #ec4899);
  border-color: rgba(255, 255, 255, 0.25);
  font-size: 1rem;
}

.pin-pad__key--submit:hover:not(:disabled) {
  background: linear-gradient(to right, #9333ea, #db2777);
}
</style>
