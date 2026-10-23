import { defineStore } from 'pinia'
import { ProfileService } from '../services/profile/index.js'

const SELECTED_PROFILE_KEY = 'selectedProfile'

// Champs conservés pour le profil sélectionné (pas d'image : localStorage limité)
function toSelectedProfile (profile) {
  if (!profile || profile.id === undefined || profile.id === null) return null
  return {
    id: profile.id,
    name: profile.name || '',
    type: profile.type || null,
    is_admin: !!profile.is_admin,
    is_child: !!profile.is_child,
    is_teen: !!profile.is_teen
  }
}

// Les identifiants arrivent en nombre (API) ou en chaîne (URL, localStorage) : comparer en chaîne
export function sameProfileId (a, b) {
  if (a === undefined || a === null || a === '' || b === undefined || b === null || b === '') return false
  return String(a) === String(b)
}

function readSelectedProfile () {
  try {
    const raw = localStorage.getItem(SELECTED_PROFILE_KEY)
    return raw ? toSelectedProfile(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profiles: [],
    currentProfile: null,
    // Profil choisi sur l'écran « Qui est-ce ? » (persisté pour les rechargements)
    selectedProfile: readSelectedProfile(),
    isLoading: false,
    error: null,
    stats: {
      total: 0,
      active: 0,
      children: 0,
      teens: 0,
      admins: 0
    },

    // Protection contre les appels multiples simultanés
    loadingPromise: null,
    lastLoadTime: null,
    loadCacheTimeout: 60000 // Cache de 60 secondes
  }),

  getters: {
    // Récupérer les profils actifs
    activeProfiles: (state) => state.profiles.filter(profile => profile.is_active),

    // Récupérer les profils enfants
    childProfiles: (state) => state.profiles.filter(profile => profile.is_child),

    // Récupérer les profils adolescents
    teenProfiles: (state) => state.profiles.filter(profile => profile.is_teen),

    // Récupérer les profils administrateurs
    adminProfiles: (state) => state.profiles.filter(profile => profile.is_admin),

    // Récupérer tous les profils non-administrateurs (enfants et adolescents)
    nonAdminProfiles: (state) => state.profiles.filter(profile =>
      profile.is_active && !profile.is_admin && (profile.is_child || profile.is_teen)
    ),

    // Récupérer un profil par ID (nombre ou chaîne : '2' et 2 désignent le même profil)
    getProfileById: (state) => (id) => state.profiles.find(profile => sameProfileId(profile.id, id)) || null,

    // Vérifier si un profil est verrouillé
    isProfileLocked: (state) => (id) => {
      const profile = state.profiles.find(profile => sameProfileId(profile.id, id))
      return profile ? profile.is_locked : false
    }
  },

  actions: {
    // Mémoriser le profil sélectionné (écran de sélection, PIN parent)
    setSelectedProfile (profile) {
      this.selectedProfile = toSelectedProfile(profile)
      try {
        if (this.selectedProfile) {
          localStorage.setItem(SELECTED_PROFILE_KEY, JSON.stringify(this.selectedProfile))
        } else {
          localStorage.removeItem(SELECTED_PROFILE_KEY)
        }
      } catch {
        // localStorage indisponible : l'état en mémoire suffit
      }
    },

    // Oublier le profil sélectionné (retour au choix des profils)
    clearSelectedProfile () {
      this.setSelectedProfile(null)
    },

    // Charger tous les profils
    async loadProfiles (force = false) {
      // Si un chargement est déjà en cours, retourner la même promesse
      if (this.loadingPromise && !force) {
        return this.loadingPromise
      }

       // Vérifier le cache : si les profils ont été chargés récemment, ne pas recharger
       const now = Date.now()
       if (!force && this.lastLoadTime && (now - this.lastLoadTime) < this.loadCacheTimeout && this.profiles.length > 0) {
         return Promise.resolve(this.profiles)
       }

      this.isLoading = true
      this.error = null

      // Créer une promesse unique pour ce chargement
      this.loadingPromise = (async () => {
        try {
          // Charger les profils directement depuis l'API
          this.profiles = await ProfileService.getAllProfiles()

          await this.loadStats()
          this.lastLoadTime = Date.now()
          return this.profiles
        } catch (error) {
          this.error = error.message
          console.error('Erreur lors du chargement des profils:', error)
          throw error
        } finally {
          this.isLoading = false
          this.loadingPromise = null
        }
      })()

      return this.loadingPromise
    },

    // Charger les statistiques
    // Statistiques calculées à partir de la liste des profils : GET /api/profiles/stats est
    // réservé au parent, et ce chargement a lieu aussi côté enfant (jeton famille → 403)
    async loadStats () {
      const profiles = Array.isArray(this.profiles) ? this.profiles : []
      this.stats = {
        total: profiles.length,
        active: profiles.filter(profile => profile.is_active).length,
        children: profiles.filter(profile => profile.is_child).length,
        teens: profiles.filter(profile => profile.is_teen).length,
        admins: profiles.filter(profile => profile.is_admin).length
      }
    },

    // Charger un profil spécifique (store local d'abord, puis API)
    async loadProfile (id) {
      this.isLoading = true
      this.error = null

      try {
        const localProfile = this.getProfileById(id)
        if (localProfile) {
          this.currentProfile = localProfile
          return localProfile
        }

        const profile = await ProfileService.getProfileById(id)
        if (!profile) {
          throw new Error('Profil non trouvé')
        }
        this.currentProfile = profile
        return profile
      } catch (error) {
        this.error = error.message
        console.error('Erreur lors du chargement du profil:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Créer un nouveau profil
    async createProfile (profileData) {
      this.isLoading = true
      this.error = null

      try {
        const newProfile = await ProfileService.createProfile(profileData)
        this.profiles.unshift(newProfile)

        await this.loadStats()
        return newProfile
      } catch (error) {
        this.error = error.message
        console.error('Erreur lors de la création du profil:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Mettre à jour un profil
    async updateProfile (id, profileData) {
      this.isLoading = true
      this.error = null

      try {
        const updatedProfile = await ProfileService.updateProfile(id, profileData)

        // Mettre à jour dans la liste
        const index = this.profiles.findIndex(profile => sameProfileId(profile.id, id))
        if (index !== -1) {
          this.profiles[index] = updatedProfile
        }

        // Mettre à jour le profil actuel si c'est le même
        if (this.currentProfile && sameProfileId(this.currentProfile.id, id)) {
          this.currentProfile = updatedProfile
        }

        await this.loadStats()
        return updatedProfile
      } catch (error) {
        this.error = error.message
        console.error('Erreur lors de la mise à jour du profil:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Supprimer un profil
    async deleteProfile (id) {
      this.isLoading = true
      this.error = null

      try {
        await ProfileService.deleteProfile(id)

        // Retirer de la liste
        this.profiles = this.profiles.filter(profile => !sameProfileId(profile.id, id))

        // Nettoyer le profil actuel si c'est le même
        if (this.currentProfile && sameProfileId(this.currentProfile.id, id)) {
          this.currentProfile = null
        }

        await this.loadStats()
      } catch (error) {
        this.error = error.message
        console.error('Erreur lors de la suppression du profil:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Basculer le statut actif d'un profil
    async toggleProfileStatus (id) {
      try {
        const updatedProfile = await ProfileService.toggleProfileStatus(id)

        // Mettre à jour dans la liste
        const index = this.profiles.findIndex(profile => sameProfileId(profile.id, id))
        if (index !== -1) {
          this.profiles[index] = updatedProfile
        }

        await this.loadStats()
        return updatedProfile
      } catch (error) {
        this.error = error.message
        console.error('Erreur lors du basculement du statut:', error)
        throw error
      }
    },

    // Basculer le verrouillage d'un profil
    async toggleProfileLock (id) {
      try {
        const updatedProfile = await ProfileService.toggleProfileLock(id)

        // Mettre à jour dans la liste
        const index = this.profiles.findIndex(profile => sameProfileId(profile.id, id))
        if (index !== -1) {
          this.profiles[index] = updatedProfile
        }

        return updatedProfile
      } catch (error) {
        this.error = error.message
        console.error('Erreur lors du basculement du verrouillage:', error)
        throw error
      }
    },

    // Oublier le cache (rafraîchissement manuel : le prochain chargement interroge l'API)
    invalidateCache () {
      this.lastLoadTime = null
    },

    // Nettoyer les erreurs
    clearError () {
      this.error = null
    },

    // Réinitialiser l'état
    reset () {
      this.profiles = []
      this.currentProfile = null
      this.isLoading = false
      this.error = null
      this.stats = {
        total: 0,
        active: 0,
        children: 0,
        teens: 0,
        admins: 0
      }
      // Réinitialiser les protections
      this.loadingPromise = null
      this.lastLoadTime = null
    },

    // Forcer le rechargement des profils
    async refreshProfiles () {
      try {
        // Forcer le rechargement en ignorant le cache
        await this.loadProfiles(true)

      } catch (error) {
        console.error('Erreur lors du rechargement des profils:', error)
        throw error
      }
    }

  }
})
