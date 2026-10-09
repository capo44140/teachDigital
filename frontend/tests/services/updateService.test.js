import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  displayVersion,
  isNewerBuildAvailable,
  isChunkLoadError,
  reloadOnceAfterChunkError
} from '../../src/services/updateService.js'

describe('updateService - détection de mise à jour', () => {
  it('compare le build exécuté au build annoncé par le serveur', () => {
    expect(isNewerBuildAvailable({ version: '1.0.2', build: '1.0.2-200' }, '1.0.2-100')).toBe(true)
    expect(isNewerBuildAvailable({ version: '1.0.2', build: '1.0.2-100' }, '1.0.2-100')).toBe(false)
  })

  it('ne propose rien sans build exécuté connu (développement)', () => {
    expect(isNewerBuildAvailable({ version: '9.9.9', build: 'x' }, null)).toBe(false)
  })

  it('gère l\'ancien format de version.json (semver seule)', () => {
    expect(isNewerBuildAvailable({ version: '1.0.3' }, '1.0.2-100')).toBe(true)
    expect(isNewerBuildAvailable({ version: '1.0.2' }, '1.0.2-100')).toBe(false)
  })

  it('extrait la version lisible du build', () => {
    expect(displayVersion('1.0.2-1791576733135')).toBe('1.0.2')
    expect(displayVersion('1.0.2')).toBe('1.0.2')
  })
})

describe('updateService - chunks introuvables après déploiement', () => {
  let reloadMock

  beforeEach(() => {
    sessionStorage.clear()
    reloadMock = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reloadMock, assign: vi.fn() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reconnaît les erreurs d\'import dynamique', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true)
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Autre erreur'))).toBe(false)
  })

  it('ne recharge qu\'une seule fois', () => {
    expect(reloadOnceAfterChunkError()).toBe(true)
    expect(reloadOnceAfterChunkError()).toBe(false)
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })
})
