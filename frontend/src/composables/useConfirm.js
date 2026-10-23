import { reactive, readonly } from 'vue'

/**
 * Boîte de confirmation accessible (remplace window.confirm).
 * Le composant ConfirmDialog, monté une seule fois dans App.vue, affiche la demande courante.
 *
 * Usage :
 *   const { confirm } = useConfirm()
 *   if (await confirm({ title: 'Supprimer ?', message: '…', confirmLabel: 'Supprimer', danger: true })) { … }
 * Options API : this.$confirm({ … })
 */

const state = reactive({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  danger: false
})

let pendingResolve = null

/**
 * Ouvrir la confirmation
 * @param {string|{ title?: string, message?: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} options
 * @returns {Promise<boolean>} true si l'utilisateur confirme
 */
export function confirmAction (options = {}) {
  const opts = typeof options === 'string' ? { message: options } : (options || {})

  // Une seule demande à la fois : la précédente est considérée comme annulée
  if (pendingResolve) {
    pendingResolve(false)
    pendingResolve = null
  }

  state.title = opts.title || 'Confirmation'
  state.message = opts.message || ''
  state.confirmLabel = opts.confirmLabel || 'Confirmer'
  state.cancelLabel = opts.cancelLabel || 'Annuler'
  state.danger = !!opts.danger
  state.open = true

  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

/**
 * Répondre à la demande en cours (utilisé par ConfirmDialog)
 * @param {boolean} accepted
 */
export function settleConfirm (accepted) {
  state.open = false
  const resolve = pendingResolve
  pendingResolve = null
  if (resolve) resolve(!!accepted)
}

export function useConfirm () {
  return {
    confirm: confirmAction,
    state: readonly(state)
  }
}

// État interne exposé au composant d'affichage
export const confirmState = readonly(state)
