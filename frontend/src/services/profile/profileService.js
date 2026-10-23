import { apiService } from '../apiService.js'
import { auditLogService } from '../auditLogService.js'

// Endpoints /api/profiles (réponses { success, data: { profiles | profile } })
const profileApi = {
  async list () {
    const response = await apiService.request('/api/profiles')
    return response.success ? response.data.profiles : []
  },
  async get (id) {
    const response = await apiService.request(`/api/profiles/${id}`)
    return response.success ? response.data.profile : null
  },
  async create (profileData) {
    const response = await apiService.request('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(profileData)
    })
    return response.success ? response.data.profile : null
  },
  async update (id, profileData) {
    const response = await apiService.request(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
    return response.success ? response.data.profile : null
  },
  async remove (id) {
    const response = await apiService.request(`/api/profiles/${id}`, { method: 'DELETE' })
    return response.success
  }
}

/**
 * Service principal pour la gestion des profils
 * Gère les opérations CRUD et les fonctionnalités de base des profils
 *
 * ⚠️ IMPORTANT: Ce service communique via l'API backend, pas d'accès direct DB
 */
export class ProfileService {
  // Récupérer tous les profils
  static async getAllProfiles () {
    try {
      const profiles = await profileApi.list()
      return profiles
    } catch (error) {
      console.error('Erreur lors de la récupération des profils:', error)
      throw error
    }
  }

  // Récupérer un profil par ID
  static async getProfileById (id) {
    try {
      const profile = await profileApi.get(id)
      return profile || null
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error)
      throw error
    }
  }

  // Créer un nouveau profil
  static async createProfile (profileData) {
    try {
      const {
        name,
        description,
        type,
        color = 'purple',
        avatarClass,
        avatarContent,
        imageUrl,
        imageData,
        imageType,
        level
      } = profileData

      const result = await profileApi.create({
        name,
        description,
        type,
        color,
        avatar_class: avatarClass,
        avatar_content: avatarContent,
        image_url: imageUrl,
        image_data: imageData,
        image_type: imageType,
        level
      })

      // Enregistrer la création du profil dans les logs d'audit
      auditLogService.logProfileChange(
        result.id,
        'PROFILE_CREATED',
        {
          name: result.name,
          type: result.type
        }
      )

      return result
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error)
      auditLogService.logSystemError(
        'Profile creation failed',
        'ProfileService',
        { error: error.message, profileData: { name: profileData.name, type: profileData.type } }
      )
      throw error
    }
  }

  // Mettre à jour un profil
  static async updateProfile (id, profileData) {
    try {
      const {
        name,
        description,
        type,
        color,
        avatarClass,
        avatarContent,
        imageUrl,
        imageData,
        imageType,
        isActive,
        isLocked,
        level
      } = profileData

      const result = await profileApi.update(id, {
        name,
        description,
        type,
        color,
        avatar_class: avatarClass,
        avatar_content: avatarContent,
        image_url: imageUrl,
        image_data: imageData,
        image_type: imageType,
        is_active: isActive,
        is_locked: isLocked,
        level
      })

      return result
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error)
      throw error
    }
  }

  // Supprimer un profil
  static async deleteProfile (id) {
    try {
      const result = await profileApi.remove(id)
      return result
    } catch (error) {
      console.error('Erreur lors de la suppression du profil:', error)
      throw error
    }
  }

  // Basculer le statut actif d'un profil
  static async toggleProfileStatus (id) {
    try {
      const profile = await this.getProfileById(id)
      if (!profile) throw new Error('Profil non trouvé')

      const result = await this.updateProfile(id, {
        ...profile,
        isActive: !profile.is_active
      })
      return result
    } catch (error) {
      console.error('Erreur lors du basculement du statut:', error)
      throw error
    }
  }

  // Basculer le verrouillage d'un profil
  static async toggleProfileLock (id) {
    try {
      const profile = await this.getProfileById(id)
      if (!profile) throw new Error('Profil non trouvé')

      const result = await this.updateProfile(id, {
        ...profile,
        isLocked: !profile.is_locked
      })
      return result
    } catch (error) {
      console.error('Erreur lors du basculement du verrouillage:', error)
      throw error
    }
  }

  /**
   * Demander la création d'un nouveau profil (validation par un parent/admin)
   * Endpoint public: /api/profiles/requests
   */
  static async requestProfileCreation ({ name, type = 'child' }) {
    try {
      const response = await apiService.request('/api/profiles/requests', {
        method: 'POST',
        body: JSON.stringify({ name, type })
      })
      return response
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande de profil:', error)
      throw error
    }
  }

  // Mettre à jour l'image d'un profil
  static async updateProfileImage (profileId, imageData, imageType) {
    try {
      const result = await this.updateProfile(profileId, {
        imageData,
        imageType
      })
      return result
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error)
      throw error
    }
  }

  // Supprimer l'image d'un profil
  static async removeProfileImage (profileId) {
    try {
      const result = await this.updateProfile(profileId, {
        imageData: null,
        imageType: null
      })
      return result
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error)
      throw error
    }
  }

  // Convertir un fichier en base64
  static async fileToBase64 (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  // Valider le type de fichier image
  static validateImageType (file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    return allowedTypes.includes(file.type)
  }

  // Valider la taille du fichier : le serveur limite image_data (data URL base64) à 2 Mo,
  // soit environ 1,5 Mo d'image avant encodage
  static validateImageSize (file) {
    const MAX_ENCODED_LENGTH = 2 * 1024 * 1024
    const encodedLength = Math.ceil(file.size / 3) * 4 + 64 // base64 + préfixe « data:…;base64, »
    return encodedLength <= MAX_ENCODED_LENGTH
  }
}
