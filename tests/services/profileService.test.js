import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProfileService } from '../../src/services/profileService.js'

// Mock de la base de données
const mockSql = vi.fn()
vi.mock('../../src/config/database.js', () => ({
  default: mockSql
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

vi.mock('../../src/services/auditLogService.js', () => ({
  auditLogService: {
    logProfileAction: vi.fn(),
    logSecurityEvent: vi.fn()
  }
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
      
      mockSql.mockResolvedValue(mockProfiles)

      const result = await ProfileService.getAllProfiles()

      expect(result).toEqual(mockProfiles)
      expect(mockSql).toHaveBeenCalledWith(expect.any(String))
    })

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')
      mockSql.mockRejectedValue(error)

      await expect(ProfileService.getAllProfiles()).rejects.toThrow('Database connection failed')
    })
  })

  describe('getProfileById', () => {
    it('should return a profile by ID', async () => {
      const mockProfile = { id: 1, name: 'Test Profile', type: 'child' }
      mockSql.mockResolvedValue([mockProfile])

      const result = await ProfileService.getProfileById(1)

      expect(result).toEqual(mockProfile)
      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('WHERE id ='))
    })

    it('should return null if profile not found', async () => {
      mockSql.mockResolvedValue([])

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
      mockSql.mockResolvedValue([mockCreatedProfile])

      const result = await ProfileService.createProfile(profileData)

      expect(result).toEqual(mockCreatedProfile)
      expect(mockSql).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Nom vide
        type: 'invalid_type'
      }

      await expect(ProfileService.createProfile(invalidData)).rejects.toThrow()
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
      mockSql.mockResolvedValue([mockUpdatedProfile])

      const result = await ProfileService.updateProfile(profileId, updateData)

      expect(result).toEqual(mockUpdatedProfile)
      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('UPDATE profiles'))
    })

    it('should handle profile not found', async () => {
      mockSql.mockResolvedValue([])

      await expect(ProfileService.updateProfile(999, { name: 'Test' })).rejects.toThrow('Profil non trouvé')
    })
  })

  describe('deleteProfile', () => {
    it('should delete a profile successfully', async () => {
      const profileId = 1
      mockSql.mockResolvedValue([{ id: profileId }])

      await ProfileService.deleteProfile(profileId)

      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM profiles'))
    })

    it('should handle profile not found during deletion', async () => {
      mockSql.mockResolvedValue([])

      await expect(ProfileService.deleteProfile(999)).rejects.toThrow('Profil non trouvé')
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

      mockSql.mockResolvedValue([mockStats])

      const result = await ProfileService.getProfileStats()

      expect(result).toEqual(mockStats)
    })
  })
})
