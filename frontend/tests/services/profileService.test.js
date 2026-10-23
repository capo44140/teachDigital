import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProfileService } from '../../src/services/profile/profileService.js'

// Le transport est simulé : on vérifie les endpoints /api/profiles appelés et la lecture des réponses
const mockApiService = vi.hoisted(() => ({
  request: vi.fn()
}))

vi.mock('../../src/services/apiService.js', () => ({
  apiService: mockApiService
}))

vi.mock('../../src/services/auditLogService.js', () => ({
  auditLogService: {
    logProfileChange: vi.fn(),
    logSystemError: vi.fn()
  }
}))

const ok = (data) => ({ success: true, data })

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllProfiles', () => {
    it('GET /api/profiles et renvoie data.profiles', async () => {
      const mockProfiles = [
        { id: 1, name: 'Test Profile 1', type: 'child' },
        { id: 2, name: 'Test Profile 2', type: 'teen' }
      ]
      mockApiService.request.mockResolvedValue(ok({ profiles: mockProfiles }))

      const result = await ProfileService.getAllProfiles()

      expect(result).toEqual(mockProfiles)
      expect(mockApiService.request).toHaveBeenCalledWith('/api/profiles')
    })

    it('propage les erreurs de l\'API', async () => {
      mockApiService.request.mockRejectedValue(new Error('Database connection failed'))

      await expect(ProfileService.getAllProfiles()).rejects.toThrow('Database connection failed')
    })

    it('réponse sans succès : liste vide', async () => {
      mockApiService.request.mockResolvedValue({ success: false })

      await expect(ProfileService.getAllProfiles()).resolves.toEqual([])
    })
  })

  describe('getProfileById', () => {
    it('GET /api/profiles/:id et renvoie data.profile', async () => {
      const mockProfile = { id: 1, name: 'Test Profile', type: 'child' }
      mockApiService.request.mockResolvedValue(ok({ profile: mockProfile }))

      const result = await ProfileService.getProfileById(1)

      expect(result).toEqual(mockProfile)
      expect(mockApiService.request).toHaveBeenCalledWith('/api/profiles/1')
    })

    it('renvoie null si le profil est introuvable', async () => {
      mockApiService.request.mockResolvedValue(ok({ profile: null }))

      await expect(ProfileService.getProfileById(999)).resolves.toBeNull()
    })
  })

  describe('createProfile', () => {
    it('POST /api/profiles avec les champs au format du serveur', async () => {
      const profileData = {
        name: 'New Profile',
        description: 'Test description',
        type: 'child',
        color: 'blue',
        avatarClass: 'bg-blue-500',
        level: 'CE1'
      }
      const created = { id: 3, name: 'New Profile', type: 'child' }
      mockApiService.request.mockResolvedValue(ok({ profile: created }))

      const result = await ProfileService.createProfile(profileData)

      expect(result).toEqual(created)
      const [endpoint, options] = mockApiService.request.mock.calls[0]
      expect(endpoint).toBe('/api/profiles')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toMatchObject({
        name: 'New Profile',
        type: 'child',
        color: 'blue',
        avatar_class: 'bg-blue-500',
        level: 'CE1'
      })
    })

    it('propage un refus de validation du serveur', async () => {
      mockApiService.request.mockRejectedValue(new Error('Validation failed'))

      await expect(ProfileService.createProfile({ name: '', type: 'invalid_type' })).rejects.toThrow('Validation failed')
    })
  })

  describe('updateProfile', () => {
    it('PUT /api/profiles/:id', async () => {
      const updated = { id: 1, name: 'Updated Profile' }
      mockApiService.request.mockResolvedValue(ok({ profile: updated }))

      const result = await ProfileService.updateProfile(1, { name: 'Updated Profile', isActive: false })

      expect(result).toEqual(updated)
      const [endpoint, options] = mockApiService.request.mock.calls[0]
      expect(endpoint).toBe('/api/profiles/1')
      expect(options.method).toBe('PUT')
      expect(JSON.parse(options.body)).toMatchObject({ name: 'Updated Profile', is_active: false })
    })

    it('renvoie null si le serveur ne confirme pas', async () => {
      mockApiService.request.mockResolvedValue({ success: false })

      await expect(ProfileService.updateProfile(999, { name: 'Test' })).resolves.toBeNull()
    })
  })

  describe('deleteProfile', () => {
    it('DELETE /api/profiles/:id', async () => {
      mockApiService.request.mockResolvedValue({ success: true })

      await expect(ProfileService.deleteProfile(1)).resolves.toBe(true)
      expect(mockApiService.request).toHaveBeenCalledWith('/api/profiles/1', { method: 'DELETE' })
    })

    it('renvoie false si la suppression est refusée', async () => {
      mockApiService.request.mockResolvedValue({ success: false })

      await expect(ProfileService.deleteProfile(999)).resolves.toBe(false)
    })
  })
})
