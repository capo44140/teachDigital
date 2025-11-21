import apiService from '../services/apiService.js'

/**
 * Proxy Repository - Utilise l'API backend au lieu d'accÃ¨s direct BD
 * Ce wrapper permet aux stores de continuer Ã  fonctionner sans refonte massive
 */
export class ProfileRepository {
  async findAllProfiles () {
    try {
      return await apiService.getProfiles()
    } catch (error) {
      console.error('Erreur lors de la rÃ©cupÃ©ration des profils:', error)
      return []
    }
  }

  async findProfileById (id) {
    try {
      return await apiService.getProfile(id)
    } catch (error) {
      console.error('Erreur lors de la rÃ©cupÃ©ration du profil:', error)
      return null
    }
  }

  async createProfile (profileData) {
    try {
      return await apiService.createProfile(profileData)
    } catch (error) {
      console.error('Erreur lors de la crÃ©ation du profil:', error)
      throw error
    }
  }

  async updateProfile (id, profileData) {
    try {
      return await apiService.updateProfile(id, profileData)
    } catch (error) {
      console.error('Erreur lors de la mise Ã  jour du profil:', error)
      throw error
    }
  }

  async getProfileStats () {
    try {
      const stats = await apiService.getProfileStats(1) // TODO: faire gÃ©nÃ©rique
      return stats || { total: 0, active: 0, children: 0, teens: 0, admins: 0 }
    } catch (error) {
      console.error('Erreur lors de la rÃ©cupÃ©ration des stats:', error)
      return { total: 0, active: 0, children: 0, teens: 0, admins: 0 }
    }
  }

  async toggleProfileStatus (id) {
    return this.updateProfile(id, { is_active: true })
  }

  async toggleProfileLock (id) {
    return this.updateProfile(id, { is_locked: true })
  }

  async updateProfileImage (profileId, imageData, imageType) {
    return this.updateProfile(profileId, { image_data: imageData, image_type: imageType })
  }

  async removeProfileImage (profileId) {
    return this.updateProfile(profileId, { image_data: null, image_type: null })
  }

  async findByType (type) {
    const profiles = await this.findAllProfiles()
    return profiles.filter(p => p.type === type && p.is_active)
  }

  async findActiveProfiles () {
    const profiles = await this.findAllProfiles()
    return profiles.filter(p => p.is_active)
  }
}
