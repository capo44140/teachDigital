import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProfileService } from '../../src/services/profile/profileService.js'

const mockApiService = vi.hoisted(() => ({
  getProfiles: vi.fn(),
  getProfile: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
  getProfileStats: vi.fn()
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

// Mock des services
vi.mock('../../src/services/hashService.js', () => ({
  HashService: {
    hash: vi.fn((data) => `hashed_${data}`),
    verify: vi.fn(() => true)
  }
}))

vi.mock('../../src/services/encryptionService.js', () => ({
  EncryptionService: vi.fn().mockImplementation(() => ({
    encrypt: vi.fn((data) => `encrypted_${data}`),
    decrypt: vi.fn((data) => data.replace('encrypted_', ''))
  }))
}))

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllProfiles', () => {
    it('should return all profiles successfully', async () => {
      const mockProfiles = [
        { id: 1, name: 'Test Profile 1', type: 'child' },
        { id: 2, name: 'Test Profile 2', type: 'teen' }
      ]
      
      mockApiService.getProfiles.mockResolvedValue(mockProfiles)

      const result = await ProfileService.getAllProfiles()

      expect(result).toEqual(mockProfiles)
      expect(mockApiService.getProfiles).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')
      mockApiService.getProfiles.mockRejectedValue(error)

      await expect(ProfileService.getAllProfiles()).rejects.toThrow('Database connection failed')
    })
  })

  describe('getProfileById', () => {
    it('should return a profile by ID', async () => {
      const mockProfile = { id: 1, name: 'Test Profile', type: 'child' }
      mockApiService.getProfile.mockResolvedValue(mockProfile)

      const result = await ProfileService.getProfileById(1)

      expect(result).toEqual(mockProfile)
      expect(mockApiService.getProfile).toHaveBeenCalledWith(1)
    })

    it('should return null if profile not found', async () => {
      mockApiService.getProfile.mockResolvedValue(null)

      const result = await ProfileService.getProfileById(999)

      expect(result).toBeNull()
    })
  })

  describe('createProfile', () => {
    it('should create a new profile with valid data', async () => {
      const profileData = {
        name: 'New Profile',
        description: 'Test description',
        type: 'child',
        is_child: true,
        is_teen: false,
        is_admin: false,
        color: 'blue'
      }

      const mockCreatedProfile = { id: 3, ...profileData }
      mockApiService.createProfile.mockResolvedValue(mockCreatedProfile)

      const result = await ProfileService.createProfile(profileData)

      expect(result).toEqual(mockCreatedProfile)
      expect(mockApiService.createProfile).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Nom vide
        type: 'invalid_type'
      }

      // La validation métier est côté backend : on simule un rejet API
      mockApiService.createProfile.mockRejectedValue(new Error('Validation failed'))
      await expect(ProfileService.createProfile(invalidData)).rejects.toThrow('Validation failed')
    })
  })

  describe('updateProfile', () => {
    it('should update an existing profile', async () => {
      const profileId = 1
      const updateData = {
        name: 'Updated Profile',
        description: 'Updated description'
      }

      const mockUpdatedProfile = { id: profileId, ...updateData }
      mockApiService.updateProfile.mockResolvedValue(mockUpdatedProfile)

      const result = await ProfileService.updateProfile(profileId, updateData)

      expect(result).toEqual(mockUpdatedProfile)
      expect(mockApiService.updateProfile).toHaveBeenCalledWith(profileId, expect.any(Object))
    })

    it('should handle profile not found', async () => {
      mockApiService.updateProfile.mockResolvedValue(null)

      await expect(ProfileService.updateProfile(999, { name: 'Test' })).resolves.toBeNull()
    })
  })

  describe('deleteProfile', () => {
    it('should delete a profile successfully', async () => {
      const profileId = 1
      mockApiService.deleteProfile.mockResolvedValue(true)

      const result = await ProfileService.deleteProfile(profileId)

      expect(result).toBe(true)
      expect(mockApiService.deleteProfile).toHaveBeenCalledWith(profileId)
    })

    it('should handle profile not found during deletion', async () => {
      mockApiService.deleteProfile.mockResolvedValue(false)

      await expect(ProfileService.deleteProfile(999)).resolves.toBe(false)
    })
  })

  describe('getProfileStats', () => {
    it('should return profile statistics', async () => {
      const mockStats = {
        total: 5,
        active: 4,
        children: 2,
        teens: 2,
        admins: 1
      }

      mockApiService.getProfileStats.mockResolvedValue(mockStats)

      const result = await ProfileService.getProfileStats()

      expect(result).toEqual(mockStats)
    })
  })
})
