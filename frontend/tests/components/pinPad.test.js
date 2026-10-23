/**
 * PinPad : saisie d'un code de 4 à 8 chiffres (champ réel + pavé tactile),
 * validation par Entrée ou par le bouton, envoi automatique à 8 chiffres.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import PinPad from '../../src/components/PinPad.vue'

// Hôte v-model : journalise les événements submit
function mountPinPad (props = {}) {
  const submitted = []
  const Host = defineComponent({
    setup () {
      const code = ref('')
      return { code }
    },
    render () {
      return h(PinPad, {
        modelValue: this.code,
        'onUpdate:modelValue': (value) => { this.code = value },
        onSubmit: (value) => submitted.push(value),
        label: 'Code PIN du profil Parent',
        ...props
      })
    }
  })
  const wrapper = mount(Host, { attachTo: document.body })
  return { wrapper, submitted }
}

const input = (wrapper) => wrapper.get('input')
const submitButton = (wrapper) => wrapper.findAll('button').find(b => b.text() === 'Valider')
const digitButton = (wrapper, digit) => wrapper.findAll('button').find(b => b.text() === String(digit))

describe('PinPad', () => {
  let wrapper
  afterEach(() => {
    wrapper?.unmount()
  })

  it('associe le libellé au champ et décrit le format attendu', () => {
    ({ wrapper } = mountPinPad())
    const field = input(wrapper)
    const label = wrapper.get('label')
    expect(label.attributes('for')).toBe(field.attributes('id'))
    expect(label.text()).toBe('Code PIN du profil Parent')
    const hint = wrapper.get(`#${field.attributes('aria-describedby')}`)
    expect(hint.text()).toContain('4 à 8 chiffres')
    expect(field.attributes('minlength')).toBe('4')
    expect(field.attributes('maxlength')).toBe('8')
  })

  it('ne valide pas en dessous de 4 chiffres (Entrée ni bouton)', async () => {
    let submitted
    ({ wrapper, submitted } = mountPinPad())
    await input(wrapper).setValue('123')
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()

    await input(wrapper).trigger('keydown', { key: 'Enter' })
    await submitButton(wrapper).trigger('click')
    expect(submitted).toEqual([])
  })

  it('4 chiffres : Entrée valide le code', async () => {
    let submitted
    ({ wrapper, submitted } = mountPinPad())
    await input(wrapper).setValue('4829')
    await input(wrapper).trigger('keydown', { key: 'Enter' })
    expect(submitted).toEqual(['4829'])
  })

  it('6 chiffres : le bouton « Valider » envoie le code', async () => {
    let submitted
    ({ wrapper, submitted } = mountPinPad())
    await input(wrapper).setValue('482913')
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
    await submitButton(wrapper).trigger('click')
    expect(submitted).toEqual(['482913'])
  })

  it('ne garde que les chiffres et s\'arrête à 8 (envoi automatique)', async () => {
    let submitted
    ({ wrapper, submitted } = mountPinPad())
    await input(wrapper).setValue('12a3-4567 89')
    await nextTick()
    expect(input(wrapper).element.value).toBe('12345678')
    // 8 chiffres atteints : envoi automatique, une seule fois
    expect(submitted).toEqual(['12345678'])
    // Pavé désactivé une fois plein
    expect(digitButton(wrapper, 9).attributes('disabled')).toBeDefined()
  })

  it('pavé tactile : chiffres, effacement, puis validation', async () => {
    let submitted
    ({ wrapper, submitted } = mountPinPad())
    for (const digit of [5, 8, 2, 9, 1]) {
      await digitButton(wrapper, digit).trigger('click')
    }
    expect(input(wrapper).element.value).toBe('58291')

    await wrapper.get('button[aria-label="Effacer le dernier chiffre"]').trigger('click')
    expect(input(wrapper).element.value).toBe('5829')

    await submitButton(wrapper).trigger('click')
    expect(submitted).toEqual(['5829'])
  })

  it('désactivé : ni saisie au pavé ni validation', async () => {
    let submitted
    ({ wrapper, submitted } = mountPinPad({ disabled: true }))
    expect(input(wrapper).attributes('disabled')).toBeDefined()
    await digitButton(wrapper, 1).trigger('click')
    await input(wrapper).trigger('keydown', { key: 'Enter' })
    expect(input(wrapper).element.value).toBe('')
    expect(submitted).toEqual([])
  })
})
