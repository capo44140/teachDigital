import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getGames,
  saveGameRule,
  startGameSession,
  updateGameSession,
  lockedAccess
} from '../../src/services/gameService.js'
import { formatPlayTime, formatCountdown, gameDisplay } from '../../src/games/catalog.js'
import { swipeDirection } from '../../src/composables/useGameLoop.js'
import { ApiError } from '../../src/services/apiService.js'

const mockApiService = vi.hoisted(() => ({
  request: vi.fn()
}))

vi.mock('../../src/services/apiService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  apiService: mockApiService
}))

describe('gameService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('charge les jeux d\'un profil et le catalogue des conditions', async () => {
    mockApiService.request.mockResolvedValue({
      success: true,
      data: { games: [{ key: 'pacman' }], conditionTypes: [{ type: 'none' }] }
    })

    const result = await getGames(7)

    expect(mockApiService.request).toHaveBeenCalledWith('/api/games?profileId=7')
    expect(result).toEqual({ games: [{ key: 'pacman' }], conditionTypes: [{ type: 'none' }] })
  })

  it('réponse incomplète : listes vides', async () => {
    mockApiService.request.mockResolvedValue({ success: true, data: {} })
    expect(await getGames(7)).toEqual({ games: [], conditionTypes: [] })
  })

  it('enregistre une règle (durée vide = sans limite)', async () => {
    mockApiService.request.mockResolvedValue({ success: true, data: { game: { key: 'tetris' } } })

    const game = await saveGameRule(7, 'tetris', {
      isEnabled: true,
      conditionType: 'quizzes_today',
      conditionValue: '2',
      dailyLimitMinutes: ''
    })

    expect(game).toEqual({ key: 'tetris' })
    const [url, options] = mockApiService.request.mock.calls[0]
    expect(url).toBe('/api/games/tetris/rules/7')
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({
      isEnabled: true,
      conditionType: 'quizzes_today',
      conditionValue: 2,
      dailyLimitMinutes: null
    })
  })

  it('démarre une partie pour un profil', async () => {
    mockApiService.request.mockResolvedValue({ success: true, data: { session: { id: 3 }, access: { unlocked: true } } })

    const data = await startGameSession('pacman', '7')

    expect(data.session.id).toBe(3)
    const [url, options] = mockApiService.request.mock.calls[0]
    expect(url).toBe('/api/games/pacman/sessions')
    expect(JSON.parse(options.body)).toEqual({ profileId: 7 })
  })

  it('signal de vie : score entier positif ; keepalive en fin de page', async () => {
    mockApiService.request.mockResolvedValue({ success: true, data: { stop: false } })

    await updateGameSession(3, { score: 12.7 })
    await updateGameSession(3, { score: -5, ended: true }, { keepalive: true })

    const [url, first] = mockApiService.request.mock.calls[0]
    expect(url).toBe('/api/games/sessions/3')
    expect(JSON.parse(first.body)).toEqual({ score: 12, ended: false, idle: false })
    expect(first.keepalive).toBeUndefined()
    const [, second] = mockApiService.request.mock.calls[1]
    expect(JSON.parse(second.body)).toEqual({ score: 0, ended: true, idle: false })
    expect(second.keepalive).toBe(true)
  })

  it('reconnaît un jeu verrouillé', () => {
    const access = { unlocked: false, reason: 'time_limit', message: 'Reviens demain !' }
    const locked = new ApiError('Reviens demain !', { status: 409, code: 'GAME_LOCKED', data: { access } })
    expect(lockedAccess(locked)).toEqual(access)
    expect(lockedAccess(new ApiError('x', { status: 409, code: 'GAME_LOCKED' }))).toEqual({ unlocked: false, message: 'x' })
    expect(lockedAccess(new ApiError('Panne', { status: 500 }))).toBeNull()
  })
})

describe('affichage des jeux', () => {
  it('durées lisibles', () => {
    expect(formatPlayTime(42)).toBe('42 s')
    expect(formatPlayTime(12 * 60 + 30)).toBe('12 min')
    expect(formatPlayTime(65 * 60)).toBe('1 h 05')
    expect(formatPlayTime(-3)).toBe('0 s')
  })

  it('compte à rebours', () => {
    expect(formatCountdown(247)).toBe('4:07')
    expect(formatCountdown(0.2)).toBe('0:01')
    expect(formatCountdown(-1)).toBe('0:00')
  })

  it('jeu inconnu : affichage par défaut, sans composant', () => {
    expect(gameDisplay('pacman').component).toBeTruthy()
    expect(gameDisplay('inconnu')).toMatchObject({ icon: '🎮', component: null })
  })

  it('direction d\'un glissement du doigt', () => {
    expect(swipeDirection(40, 5)).toBe('right')
    expect(swipeDirection(-40, 10)).toBe('left')
    expect(swipeDirection(3, -30)).toBe('up')
    expect(swipeDirection(0, 25)).toBe('down')
    expect(swipeDirection(5, 5)).toBeNull()
  })
})
