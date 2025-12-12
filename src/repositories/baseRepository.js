import { apiService } from '../services/apiService.js'

/**
 * Repository de base pour les opérations CRUD communes
 * ATTENTION: Cette classe est une classe abstraite qui délègue au backend via API
 * Les repositories doivent implémenter leurs propres méthodes en utilisant apiService
 * 
 * Cette classe ne doit PAS être instanciée directement.
 * Utilisez les repositories spécifiques (ProfileRepository, LessonRepository, etc.)
 */
export class BaseRepository {
  constructor (tableName, apiEndpoint = null) {
    if (this.constructor === BaseRepository) {
      throw new Error('BaseRepository ne peut pas être instanciée directement. Utilisez un repository spécifique.')
    }
    this.tableName = tableName
    // Mapper les noms de tables aux endpoints API
    this.apiEndpoint = apiEndpoint || this.getApiEndpointFromTableName(tableName)
  }

  /**
   * Mapper un nom de table à un endpoint API
   * @param {string} tableName - Nom de la table
   * @returns {string} Endpoint API correspondant
   */
  getApiEndpointFromTableName (tableName) {
    const tableToEndpointMap = {
      profiles: '/api/profiles',
      lessons: '/api/lessons',
      notifications: '/api/notifications',
      activities: '/api/activities',
      badges: '/api/badges',
      'youtube_videos': '/api/youtube-videos'
    }
    return tableToEndpointMap[tableName] || `/api/${tableName}`
  }

  /**
   * Récupérer tous les enregistrements
   * @param {Object} options - Options de requête (orderBy, limit, offset)
   * @returns {Promise<Array>} Liste des enregistrements
   */
  async findAll (options = {}) {
    try {
      const params = new URLSearchParams()
      if (options.orderBy) params.append('orderBy', options.orderBy)
      if (options.limit) params.append('limit', options.limit)
      if (options.offset) params.append('offset', options.offset)

      const queryString = params.toString()
      const endpoint = queryString ? `${this.apiEndpoint}?${queryString}` : this.apiEndpoint
      
      const response = await apiService.request(endpoint)
      // Adapter selon le format de réponse du backend
      if (response.success && response.data) {
        // Si response.data contient un tableau directement
        if (Array.isArray(response.data)) {
          return response.data
        }
        // Si response.data contient un objet avec une propriété (ex: { profiles: [...] })
        const key = Object.keys(response.data)[0]
        return response.data[key] || []
      }
      return []
    } catch (error) {
      console.error(`Erreur lors de la récupération des ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Récupérer un enregistrement par ID
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<Object|null>} Enregistrement trouvé ou null
   */
  async findById (id) {
    try {
      const response = await apiService.request(`${this.apiEndpoint}/${id}`)
      if (response.success && response.data) {
        // Adapter selon le format de réponse
        const key = Object.keys(response.data)[0]
        return response.data[key] || response.data || null
      }
      return null
    } catch (error) {
      console.error(`Erreur lors de la récupération du ${this.tableName} par ID:`, error)
      throw error
    }
  }

  /**
   * Créer un nouvel enregistrement
   * @param {Object} data - Données à insérer
   * @returns {Promise<Object>} Enregistrement créé
   */
  async create (data) {
    try {
      const response = await apiService.request(this.apiEndpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      })
      if (response.success && response.data) {
        const key = Object.keys(response.data)[0]
        return response.data[key] || response.data
      }
      throw new Error('Erreur lors de la création')
    } catch (error) {
      console.error(`Erreur lors de la création du ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Mettre à jour un enregistrement
   * @param {number} id - ID de l'enregistrement
   * @param {Object} data - Données à mettre à jour
   * @returns {Promise<Object|null>} Enregistrement mis à jour ou null
   */
  async update (id, data) {
    try {
      const response = await apiService.request(`${this.apiEndpoint}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
      if (response.success && response.data) {
        const key = Object.keys(response.data)[0]
        return response.data[key] || response.data || null
      }
      return null
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Supprimer un enregistrement
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async delete (id) {
    try {
      const response = await apiService.request(`${this.apiEndpoint}/${id}`, {
        method: 'DELETE'
      })
      return response.success || false
    } catch (error) {
      console.error(`Erreur lors de la suppression du ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Compter le nombre d'enregistrements
   * @param {Object} conditions - Conditions de filtrage
   * @returns {Promise<number>} Nombre d'enregistrements
   */
  async count (conditions = {}) {
    try {
      // Pour le comptage, on récupère tous les éléments et on compte côté client
      // ou on utilise un endpoint spécifique si disponible
      const endpoint = `${this.apiEndpoint}/count`
      const params = new URLSearchParams()
      Object.entries(conditions).forEach(([key, value]) => {
        params.append(key, value)
      })
      
      const queryString = params.toString()
      const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint
      
      try {
        const response = await apiService.request(fullEndpoint)
        if (response.success && response.data) {
          return parseInt(response.data.count || response.data || 0)
        }
      } catch (error) {
        // Si l'endpoint /count n'existe pas, récupérer tous les éléments et compter
        const all = await this.findAll()
        if (Object.keys(conditions).length === 0) {
          return all.length
        }
        // Filtrer selon les conditions
        return all.filter(item => {
          return Object.entries(conditions).every(([key, value]) => item[key] === value)
        }).length
      }
      return 0
    } catch (error) {
      console.error(`Erreur lors du comptage des ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Exécuter une requête personnalisée
   * ATTENTION: Cette méthode n'est plus supportée car elle nécessitait SQL
   * Utilisez les endpoints API spécifiques du backend à la place
   * @param {Function} queryBuilder - Fonction qui construisait la requête SQL
   * @returns {Promise<any>} Résultat de la requête
   * @deprecated Utilisez les endpoints API spécifiques du backend
   */
  async executeCustomQuery (queryBuilder) {
    throw new Error('executeCustomQuery n\'est plus supporté. Utilisez les endpoints API spécifiques du backend.')
  }
}
