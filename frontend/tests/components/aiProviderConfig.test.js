/**
 * AIProviderConfig : autorisation d'envoyer les devoirs des enfants à un provider IA
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AIProviderConfig from '../../src/components/AIProviderConfig.vue'
import { jsonResponse, storeFamilySession, storeParentSession, profileToken } from '../services/testUtils.js'

const CONFIG = {
  name: 'OpenAI',
  label: 'OpenAI',
  keyConfigured: true,
  keySource: 'env',
  maskedKey: 'sk-test-o…-key',
  keyPlaceholder: 'sk-...',
  keyUrl: 'platform.openai.com/api-keys',
  model: 'gpt-4o',
  modelSource: 'env',
  defaultModel: 'gpt-4o',
  dataRegion: 'États-Unis',
  childDataAllowed: false,
  childDataSource: 'default'
}

describe('AIProviderConfig', () => {
  let wrapper

  beforeEach(() => {
    localStorage.clear()
    storeFamilySession()
    localStorage.setItem('auth_token', profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (options?.method === 'POST') {
        return jsonResponse(200, { success: true, data: { ...CONFIG, ...JSON.parse(options.body), childDataSource: 'ui' } })
      }
      return jsonResponse(200, { success: true, data: { models: [] } })
    }))
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
  })

  it('affiche l\'autorisation et le lieu de traitement des données', () => {
    wrapper = mount(AIProviderConfig, { props: { config: CONFIG } })
    const checkbox = wrapper.get('input[type="checkbox"]')

    expect(checkbox.element.checked).toBe(false)
    expect(wrapper.get(`#${checkbox.attributes('aria-describedby')}`).text()).toContain('États-Unis')
  })

  it('enregistre l\'autorisation seule, sans clé ni modèle', async () => {
    wrapper = mount(AIProviderConfig, { props: { config: CONFIG } })
    await flushPromises()

    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const post = fetch.mock.calls.find(([, options]) => options?.method === 'POST')
    expect(post[0]).toContain('/api/ai/providers/OpenAI/config')
    expect(JSON.parse(post[1].body)).toEqual({ childDataAllowed: true })
    expect(wrapper.emitted('saved')[0][0]).toMatchObject({ childDataAllowed: true })
  })
})
