import { ProfileService } from '../profile/profileService.js'
import { PinService } from '../profile/pinService.js'
import { SessionService } from '../profile/sessionService.js'
import { ProfileRepository } from '../../repositories/profileRepository.js'
import { auditLogService } from '../auditLogService.js'

/**
 * Service de logique métier pour les profils
 * Contient la logique complexe et les règles métier
 */
export class ProfileBusinessService {
  constructor () {
    this.profileRepository = new ProfileRepository()
  }

  /**
   * Créer un profil avec validation et chiffrement
   * @param {Object} profileData - Données du profil
   * @param {string} masterPassword - Mot de passe maître (optionnel)
   * @returns {Promise<Object>} Profil créé
   */
  async createProfileWithValidation (profileData, masterPassword = null) {
    try {
      // Validation des données
      this.validateProfileData(profileData)

      // Vérifier l'unicité du nom
      await this.checkProfileNameUniqueness(profileData.name)

      // Créer le profil avec chiffrement si nécessaire
      const newProfile = await ProfileService.createProfile(profileData, masterPassword)

      // Initialiser le code PIN par défaut
      await this.initializeDefaultPin(newProfile.id)

      // Enregistrer dans les logs d'audit
      auditLogService.logProfileChange(
        newProfile.id,
        'PROFILE_CREATED',
        {
          name: newProfile.name,
          type: newProfile.type,
          encrypted: !!masterPassword
        }
      )

      return newProfile
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un profil avec validation
   * @param {number} id - ID du profil
   * @param {Object} profileData - Données à mettre à jour
   * @returns {Promise<Object>} Profil mis à jour
   */
  async updateProfileWithValidation (id, profileData) {
    try {
      // Validation des données
      this.validateProfileData(profileData)

      // Vérifier que le profil existe
      const existingProfile = await this.profileRepository.findProfileById(id)
      if (!existingProfile) {
        throw new Error('Profil non trouvé')
      }

      // Vérifier l'unicité du nom (sauf pour le profil actuel)
      if (profileData.name !== existingProfile.name) {
        await this.checkProfileNameUniqueness(profileData.name, id)
      }

      // Mettre à jour le profil
      const updatedProfile = await this.profileRepository.updateProfile(id, profileData)

      // Enregistrer dans les logs d'audit
      auditLogService.logProfileChange(
        id,
        'PROFILE_UPDATED',
        {
          name: updatedProfile.name,
          type: updatedProfile.type,
          changes: this.getProfileChanges(existingProfile, updatedProfile)
        }
      )

      return updatedProfile
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error)
      throw error
    }
  }

  /**
   * Supprimer un profil avec vérifications de sécurité
   * @param {number} id - ID du profil
   * @param {number} currentProfileId - ID du profil actuel
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteProfileWithSecurity (id, currentProfileId) {
    try {
      // Vérifier que le profil existe
      const profile = await this.profileRepository.findProfileById(id)
      if (!profile) {
        throw new Error('Profil non trouvé')
      }

      // Empêcher la suppression de son propre profil
      if (id === currentProfileId) {
        throw new Error('Vous ne pouvez pas supprimer votre propre profil')
      }

      // Empêcher la suppression du dernier administrateur
      if (profile.is_admin) {
        const adminCount = await this.getAdminCount()
        if (adminCount <= 1) {
          throw new Error('Impossible de supprimer le dernier administrateur')
        }
      }

      // Supprimer le profil
      const success = await this.profileRepository.delete(id)

      if (success) {
        // Enregistrer dans les logs d'audit
        auditLogService.logProfileChange(
          id,
          'PROFILE_DELETED',
          {
            name: profile.name,
            type: profile.type
          }
        )
      }

      return success
    } catch (error) {
      console.error('Erreur lors de la suppression du profil:', error)
      throw error
    }
  }

  /**
   * Changer le code PIN avec validation de sécurité
   * @param {number} profileId - ID du profil
   * @param {string} currentPin - Code PIN actuel
   * @param {string} newPin - Nouveau code PIN
   * @returns {Promise<boolean>} Succès du changement
   */
  async changePinWithSecurity (profileId, currentPin, newPin) {
    try {
      // Vérifier le code PIN actuel
      const isCurrentPinValid = await PinService.verifyPin(profileId, currentPin)
      if (!isCurrentPinValid) {
        throw new Error('Code PIN actuel incorrect')
      }

      // Valider le nouveau code PIN
      const validation = PinService.validatePin(newPin)
      if (!validation.isValid) {
        throw new Error(validation.message)
      }

      // Analyser la force du nouveau code PIN
      const strength = PinService.analyzePinStrength(newPin)
      if (strength.score < 3) {
        throw new Error('Le nouveau code PIN n\'est pas assez sécurisé')
      }

      // Mettre à jour le code PIN
      await PinService.updatePin(profileId, newPin)

      // Enregistrer dans les logs d'audit
      auditLogService.logProfileChange(
        profileId,
        'PIN_CHANGED',
        {
          strength: strength.score,
          length: newPin.length
        }
      )

      return true
    } catch (error) {
      console.error('Erreur lors du changement du code PIN:', error)
      throw error
    }
  }

  /**
   * Valider les données d'un profil
   * @param {Object} profileData - Données à valider
   */
  validateProfileData (profileData) {
    if (!profileData.name || profileData.name.trim().length < 2) {
      throw new Error('Le nom du profil doit contenir au moins 2 caractères')
    }

    if (!profileData.type || !['admin', 'child', 'teen'].includes(profileData.type)) {
      throw new Error('Le type de profil doit être admin, child ou teen')
    }

    if (profileData.description && profileData.description.length > 500) {
      throw new Error('La description ne peut pas dépasser 500 caractères')
    }

    if (profileData.level && (profileData.level < 1 || profileData.level > 10)) {
      throw new Error('Le niveau doit être entre 1 et 10')
    }
  }

  /**
   * Vérifier l'unicité du nom de profil
   * @param {string} name - Nom à vérifier
   * @param {number} excludeId - ID à exclure de la vérification
   */
  async checkProfileNameUniqueness (name, excludeId = null) {
    const profiles = await this.profileRepository.findAllProfiles()
    const existingProfile = profiles.find(profile =>
      profile.name.toLowerCase() === name.toLowerCase() &&
      profile.id !== excludeId
    )

    if (existingProfile) {
      throw new Error('Un profil avec ce nom existe déjà')
    }
  }

  /**
   * Obtenir le nombre d'administrateurs
   * @returns {Promise<number>} Nombre d'administrateurs
   */
  async getAdminCount () {
    const stats = await this.profileRepository.getProfileStats()
    return stats.admins || 0
  }

  /**
   * Initialiser le code PIN par défaut
   * @param {number} profileId - ID du profil
   */
  async initializeDefaultPin (profileId) {
    try {
      await PinService.initializeDefaultPin(profileId)
    } catch (error) {
      console.warn('Erreur lors de l\'initialisation du code PIN par défaut:', error)
    }
  }

  /**
   * Obtenir les changements entre deux profils
   * @param {Object} oldProfile - Ancien profil
   * @param {Object} newProfile - Nouveau profil
   * @returns {Object} Changements détectés
   */
  getProfileChanges (oldProfile, newProfile) {
    const changes = {}

    Object.keys(newProfile).forEach(key => {
      if (oldProfile[key] !== newProfile[key]) {
        changes[key] = {
          old: oldProfile[key],
          new: newProfile[key]
        }
      }
    })

    return changes
  }

  /**
   * Obtenir les statistiques avancées des profils
   * @returns {Promise<Object>} Statistiques avancées
   */
  async getAdvancedProfileStats () {
    try {
      const basicStats = await this.profileRepository.getProfileStats()
      const profiles = await this.profileRepository.findAllProfiles()

      // Calculer des statistiques avancées
      const activeProfiles = profiles.filter(p => p.is_active)
      const lockedProfiles = profiles.filter(p => p.is_locked)
      const profilesWithImages = profiles.filter(p => p.image_data)

      return {
        ...basicStats,
        locked: lockedProfiles.length,
        withImages: profilesWithImages.length,
        averageLevel: activeProfiles.reduce((sum, p) => sum + (p.level || 0), 0) / activeProfiles.length || 0,
        typeDistribution: {
          admin: profiles.filter(p => p.is_admin).length,
          child: profiles.filter(p => p.is_child).length,
          teen: profiles.filter(p => p.is_teen).length
        }
      }
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques avancées:', error)
      throw error
    }
  }
}
