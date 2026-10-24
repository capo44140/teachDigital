import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemePicker from '../../src/components/ThemePicker.vue'
import { APP_THEMES, getAppTheme } from '../../src/themes/index.js'

const mountPicker = (props = {}) => mount(ThemePicker, {
  props: { name: 'family-theme', legend: 'Thème de la famille', modelValue: 'liquid-glass', ...props }
})

describe('ThemePicker', () => {
  it('propose un bouton radio par thème dans un groupe nommé, le thème courant coché', () => {
    const wrapper = mountPicker({ modelValue: 'netflix' })
    const radios = wrapper.findAll('input[type="radio"]')

    expect(wrapper.find('fieldset legend').text()).toBe('Thème de la famille')
    expect(radios).toHaveLength(APP_THEMES.length)
    expect(radios.map(radio => radio.element.name)).toEqual(APP_THEMES.map(() => 'family-theme'))
    expect(radios.map(radio => radio.element.checked)).toEqual([false, true, false, false])
    expect(wrapper.find('.theme-card--selected').text()).toContain('Netflix')
  })

  it('chaque carte nomme et décrit son thème ; la miniature est décorative', () => {
    const wrapper = mountPicker()
    const radio = wrapper.find('input[value="paw-patrol"]')
    const label = radio.element.closest('label')

    expect(label.textContent).toContain('Pat\' Patrouille')
    const description = wrapper.find(`#${radio.attributes('aria-describedby')}`)
    expect(description.text()).toBe(getAppTheme('paw-patrol').description)
    expect(label.querySelector('.theme-card__preview').getAttribute('aria-hidden')).toBe('true')
  })

  it('dessine la miniature avec les couleurs du thème', () => {
    const wrapper = mountPicker()
    const preview = wrapper.find('input[value="desperate-housewives"]').element.closest('label').querySelector('.theme-card__preview')

    expect(preview.style.getPropertyValue('--pv-accent')).toBe(getAppTheme('desperate-housewives').preview.accent)
    expect(preview.style.getPropertyValue('--pv-title-font')).toContain('Playfair Display')
  })

  it('émet le thème choisi', async () => {
    const wrapper = mountPicker()
    await wrapper.find('input[value="desperate-housewives"]').setValue()
    expect(wrapper.emitted('update:modelValue')).toEqual([['desperate-housewives']])
  })

  it('option « Comme la famille » : cochée sans thème propre, elle renvoie null', async () => {
    const wrapper = mountPicker({
      name: 'child-theme',
      modelValue: null,
      inheritTheme: getAppTheme('netflix'),
      inheritLabel: 'Comme ma famille'
    })
    const radios = wrapper.findAll('input[type="radio"]')

    expect(radios).toHaveLength(APP_THEMES.length + 1)
    expect(radios[0].element.checked).toBe(true)
    const inheritLabel = radios[0].element.closest('label').textContent
    expect(inheritLabel).toContain('Comme ma famille')
    expect(inheritLabel).toContain('Actuellement : 🍿 Netflix')

    await radios[3].setValue()
    await wrapper.setProps({ modelValue: 'paw-patrol' })
    await radios[0].setValue()
    expect(wrapper.emitted('update:modelValue')).toEqual([['paw-patrol'], [null]])
  })
})
