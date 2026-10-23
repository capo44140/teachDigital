/**
 * BaseModal et ConfirmDialog : rôle, nom accessible, focus initial, piège à focus,
 * Échap, clic sur le fond et restauration du focus à la fermeture.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import BaseModal from '../../src/components/BaseModal.vue'
import ConfirmDialog from '../../src/components/ConfirmDialog.vue'
import { confirmAction } from '../../src/composables/useConfirm.js'

async function flush () {
  for (let i = 0; i < 3; i++) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

const key = (target, k, opts = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts }))

// Hôte : un bouton d'ouverture + une modale à trois contrôles
function mountHost (modalProps = {}) {
  const Host = defineComponent({
    setup () {
      const open = ref(false)
      const closes = ref(0)
      return { open, closes }
    },
    render () {
      return h('div', [
        h('button', { id: 'opener', onClick: () => { this.open = true } }, 'Ouvrir'),
        h(BaseModal, {
          open: this.open,
          labelledby: 'modal-title',
          ...modalProps,
          onClose: () => { this.closes++; this.open = false }
        }, () => [
          h('h2', { id: 'modal-title' }, 'Titre'),
          h('button', { id: 'first' }, 'Fermer'),
          h('input', { id: 'field' }),
          h('button', { id: 'last' }, 'Valider')
        ])
      ])
    }
  })
  return mount(Host, { attachTo: document.body })
}

describe('BaseModal', () => {
  let wrapper
  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('expose role="dialog", aria-modal et le titre, puis focalise le premier champ', async () => {
    wrapper = mountHost()
    const opener = document.getElementById('opener')
    opener.focus()
    opener.click()
    await flush()

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title')
    // Premier champ de saisie privilégié
    expect(document.activeElement.id).toBe('field')
  })

  it('piège le focus : Tab sur le dernier revient au premier, Maj+Tab sur le premier va au dernier', async () => {
    wrapper = mountHost()
    document.getElementById('opener').click()
    await flush()

    document.getElementById('last').focus()
    key(document.getElementById('last'), 'Tab')
    expect(document.activeElement.id).toBe('first')

    key(document.getElementById('first'), 'Tab', { shiftKey: true })
    expect(document.activeElement.id).toBe('last')
  })

  it('ramène dans la fenêtre un focus parti à l\'extérieur', async () => {
    wrapper = mountHost()
    const opener = document.getElementById('opener')
    opener.click()
    await flush()

    opener.focus()
    expect(document.querySelector('[role="dialog"]').contains(document.activeElement)).toBe(true)
  })

  it('Échap ferme la fenêtre et rend le focus au bouton d\'ouverture', async () => {
    wrapper = mountHost()
    const opener = document.getElementById('opener')
    opener.focus()
    opener.click()
    await flush()

    key(document.activeElement, 'Escape')
    await flush()

    expect(wrapper.vm.closes).toBe(1)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('persistent : ni Échap ni le fond ne ferment', async () => {
    wrapper = mountHost({ persistent: true })
    document.getElementById('opener').click()
    await flush()

    key(document.activeElement, 'Escape')
    document.querySelector('[role="dialog"]').parentElement.click()
    await flush()

    expect(wrapper.vm.closes).toBe(0)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
  })

  it('un clic sur le fond ferme, un clic dans le panneau non', async () => {
    wrapper = mountHost()
    document.getElementById('opener').click()
    await flush()

    document.getElementById('modal-title').click()
    await flush()
    expect(wrapper.vm.closes).toBe(0)

    document.querySelector('[role="dialog"]').parentElement.click()
    await flush()
    expect(wrapper.vm.closes).toBe(1)
  })
})

describe('ConfirmDialog', () => {
  let wrapper
  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('alertdialog : focus sur « Annuler », Échap résout false et rend le focus', async () => {
    wrapper = mount(ConfirmDialog, { attachTo: document.body })
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const answer = confirmAction({ title: 'Supprimer ?', message: 'Action définitive', confirmLabel: 'Supprimer', danger: true })
    await flush()

    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-dialog-title')
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-dialog-message')
    expect(document.activeElement.textContent.trim()).toBe('Annuler')

    // Tab depuis le dernier bouton : retour sur « Annuler »
    const buttons = dialog.querySelectorAll('button')
    buttons[1].focus()
    key(buttons[1], 'Tab')
    expect(document.activeElement).toBe(buttons[0])

    key(document.activeElement, 'Escape')
    await expect(answer).resolves.toBe(false)
    await flush()
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('le bouton de confirmation résout true', async () => {
    wrapper = mount(ConfirmDialog, { attachTo: document.body })
    const answer = confirmAction({ message: 'Continuer ?' })
    await flush()

    const confirmButton = [...document.querySelectorAll('[role="alertdialog"] button')].find(b => b.textContent.trim() === 'Confirmer')
    confirmButton.click()
    await expect(answer).resolves.toBe(true)
  })
})
