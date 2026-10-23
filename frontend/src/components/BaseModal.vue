<template>
  <!--
    Base accessible de toutes les fenêtres modales (ConfirmDialog, formulaires, détails…) :
    role="dialog" (ou alertdialog), aria-modal, titre associé (aria-labelledby),
    focus initial dans la fenêtre, focus piégé (Tab / Maj+Tab), Échap ferme,
    clic sur le fond ferme, focus rendu à l'élément d'origine à la fermeture.
    L'apparence (fond, panneau) reste celle de chaque écran via overlayClass / panelClass ;
    ces classes doivent être globales (Tailwind ou style non scopé) : le fond et le panneau sont
    rendus par BaseModal, hors de la portée des styles scopés de l'écran appelant.

    Usage :
      <BaseModal :open="showForm" labelledby="form-title" @close="showForm = false">
        <h2 id="form-title">…</h2> …
      </BaseModal>
  -->
  <Teleport to="body" :disabled="!teleport">
    <!-- Transition facultative : sans nom, aucune animation (css=false, retrait immédiat) -->
    <Transition :name="transition || undefined" :css="!!transition">
      <!-- Fond : simple présentation, la fermeture au clavier passe par Échap -->
      <div
        v-if="open"
        :class="overlayClass"
        role="presentation"
        @click.self="onBackdropClick"
      >
        <div
          ref="panel"
          :class="panelClass"
          :role="role"
          aria-modal="true"
          :aria-labelledby="labelledby || undefined"
          :aria-label="labelledby ? undefined : (label || undefined)"
          :aria-describedby="describedby || undefined"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <slot :close="requestClose" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // Affichage de la fenêtre
  open: { type: Boolean, default: false },
  // Id du titre visible (prioritaire sur label)
  labelledby: { type: String, default: '' },
  // Nom accessible lorsqu'aucun titre visible n'existe
  label: { type: String, default: '' },
  describedby: { type: String, default: '' },
  // dialog | alertdialog (confirmation)
  role: {
    type: String,
    default: 'dialog',
    validator: (value) => ['dialog', 'alertdialog'].includes(value)
  },
  // Sélecteur CSS de l'élément à focaliser à l'ouverture (sinon premier champ, sinon premier contrôle)
  initialFocus: { type: String, default: '' },
  // Fermeture impossible (Échap / fond) — par ex. pendant un envoi
  persistent: { type: Boolean, default: false },
  closeOnBackdrop: { type: Boolean, default: true },
  teleport: { type: Boolean, default: true },
  // Nom de transition Vue (classes globales <nom>-enter-active…), vide = aucune
  transition: { type: String, default: '' },
  overlayClass: {
    type: [String, Array, Object],
    default: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
  },
  panelClass: {
    type: [String, Array, Object],
    default: 'relative w-full max-w-lg'
  }
})

const emit = defineEmits(['close'])

const panel = ref(null)
let previouslyFocused = null

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'audio[controls]', 'video[controls]',
  '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])'
].join(',')

// Contrôle réellement affiché : ni masqué (hidden, .hidden, aria-hidden, v-show) ni sans boîte.
// La vérification de mise en page n'a lieu que si le navigateur en calcule une (pas sous jsdom).
function isShown (el) {
  if (el.closest('[hidden], .hidden, [aria-hidden="true"], [style*="display: none"]')) return false
  const layoutAvailable = panel.value && panel.value.getClientRects().length > 0
  return !layoutAvailable || el.getClientRects().length > 0
}

function focusableElements () {
  if (!panel.value) return []
  return [...panel.value.querySelectorAll(FOCUSABLE)].filter(isShown)
}

function focusInitial () {
  const root = panel.value
  if (!root) return
  const pick = (selector) => selector ? [...root.querySelectorAll(selector)].find(isShown) : null
  const target =
    pick(props.initialFocus) ||
    pick('[autofocus], [data-autofocus]') ||
    // Premier champ de saisie visible (hors sélecteur de fichier, souvent masqué)
    pick('input:not([disabled]):not([type="hidden"]):not([type="file"]), select:not([disabled]), textarea:not([disabled])') ||
    focusableElements()[0] ||
    root
  target.focus()
}

function requestClose () {
  emit('close')
}

function onBackdropClick () {
  if (props.closeOnBackdrop && !props.persistent) requestClose()
}

function onKeydown (event) {
  if (event.key === 'Escape' || event.key === 'Esc') {
    event.stopPropagation()
    if (!props.persistent) {
      event.preventDefault()
      requestClose()
    }
    return
  }
  if (event.key !== 'Tab') return

  const items = focusableElements()
  if (items.length === 0) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === panel.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

// Le focus qui sort de la fenêtre du dessus (clic sur le fond, outil d'assistance…) y est ramené
function onDocumentFocusIn (event) {
  if (!props.open || modalStack[modalStack.length - 1] !== panel.value || !panel.value) return
  if (!panel.value.contains(event.target)) {
    focusInitial()
  }
}

async function activate () {
  previouslyFocused = document.activeElement
  await nextTick()
  if (!panel.value) return
  if (!modalStack.includes(panel.value)) modalStack.push(panel.value)
  document.addEventListener('focusin', onDocumentFocusIn)
  focusInitial()
}

function deactivate (panelEl) {
  const index = modalStack.indexOf(panelEl)
  if (index !== -1) modalStack.splice(index, 1)
  document.removeEventListener('focusin', onDocumentFocusIn)
  const target = previouslyFocused
  previouslyFocused = null
  if (target && typeof target.focus === 'function' && target.isConnected) {
    target.focus()
  }
}

let currentPanel = null
watch(() => props.open, async (open) => {
  if (open) {
    await activate()
    currentPanel = panel.value
  } else if (currentPanel || previouslyFocused) {
    deactivate(currentPanel)
    currentPanel = null
  }
})

onMounted(async () => {
  if (props.open) {
    await activate()
    currentPanel = panel.value
  }
})

onBeforeUnmount(() => {
  if (currentPanel) {
    deactivate(currentPanel)
    currentPanel = null
  }
})
</script>

<script>
// Pile partagée par toutes les instances (fenêtres imbriquées : confirmation au-dessus d'un
// formulaire) : seule la fenêtre du dessus retient le focus
const modalStack = []
</script>
