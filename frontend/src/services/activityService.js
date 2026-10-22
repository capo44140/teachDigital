import { apiService } from './apiService.js'

/**
 * Service de gestion des activités (devoirs, tâches, projets…).
 * Toutes les opérations passent par l'API backend : plus de données simulées.
 */
class ActivityService {
  constructor () {
    this.activities = [] // Cache local (stats, export CSV)
  }

  /**
   * Récupérer les activités
   * @param {Object} filters - Filtres optionnels (child_id, status, priority, search)
   * @returns {Promise<Array>}
   */
  async getActivities (filters = {}) {
    try {
      const params = new URLSearchParams()
      if (filters.child_id !== undefined && filters.child_id !== null && filters.child_id !== '') {
        params.append('child_id', filters.child_id)
      }
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.search) params.append('search', filters.search)

      const endpoint = params.toString() ? `/api/activities?${params}` : '/api/activities'
      const response = await apiService.request(endpoint)

      this.activities = response?.data?.activities || []
      return this.activities
    } catch (error) {
      console.error('Erreur lors de la récupération des activités:', error)
      throw error
    }
  }

  /**
   * Récupérer une activité par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getActivityById (id) {
    try {
      const response = await apiService.request(`/api/activities/${id}`)
      return response?.data?.activity || null
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'activité:', error)
      throw error
    }
  }

  /**
   * Ne garder que les champs modifiables par l'API, et convertir les valeurs vides
   * des champs optionnels en null (sinon le backend reçoit une chaîne vide).
   */
  normalizePayload (activityData = {}) {
    const payload = {}
    const fields = [
      'title', 'description', 'child_id', 'priority', 'due_date', 'status',
      'type', 'difficulty_level', 'estimated_duration', 'target_age_group',
      'subject_area', 'is_active'
    ]

    for (const field of fields) {
      if (activityData[field] === undefined) continue
      const value = activityData[field]
      payload[field] = (field === 'child_id' || field === 'due_date') && value === '' ? null : value
    }

    return payload
  }

  /**
   * Créer une activité
   * @param {Object} activityData
   * @returns {Promise<Object|null>}
   */
  async createActivity (activityData) {
    try {
      const response = await apiService.request('/api/activities', {
        method: 'POST',
        body: JSON.stringify(this.normalizePayload(activityData))
      })
      return response?.data?.activity || null
    } catch (error) {
      console.error('Erreur lors de la création de l\'activité:', error)
      throw error
    }
  }

  /**
   * Mettre à jour une activité
   * @param {number} id
   * @param {Object} updateData
   * @returns {Promise<Object|null>}
   */
  async updateActivity (id, updateData) {
    try {
      const response = await apiService.request(`/api/activities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(this.normalizePayload(updateData))
      })
      return response?.data?.activity || null
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'activité:', error)
      throw error
    }
  }

  /**
   * Supprimer une activité
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async deleteActivity (id) {
    try {
      const response = await apiService.request(`/api/activities/${id}`, { method: 'DELETE' })
      return response?.success === true
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'activité:', error)
      throw error
    }
  }

  /**
   * Changer le statut d'une activité
   * @param {number} id
   * @param {string} status
   * @returns {Promise<Object|null>}
   */
  async updateActivityStatus (id, status) {
    return this.updateActivity(id, { status })
  }

  /**
   * Statistiques calculées à partir des activités de l'API
   * @param {number|null} childId
   * @returns {Promise<Object>}
   */
  async getActivityStats (childId = null) {
    const activities = await this.getActivities(childId ? { child_id: childId } : {})

    const stats = {
      total: activities.length,
      active: activities.filter(a => a.status === 'active').length,
      completed: activities.filter(a => a.status === 'completed').length,
      paused: activities.filter(a => a.status === 'paused').length,
      cancelled: activities.filter(a => a.status === 'cancelled').length,
      high_priority: activities.filter(a => a.priority === 'high').length,
      medium_priority: activities.filter(a => a.priority === 'medium').length,
      low_priority: activities.filter(a => a.priority === 'low').length,
      overdue: activities.filter(a => {
        if (!a.due_date || a.status === 'completed' || a.status === 'cancelled') return false
        return new Date(a.due_date) < new Date()
      }).length
    }

    stats.completion_rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    return stats
  }

  /**
   * Récupérer les activités d'un enfant
   * @param {number} childId
   * @returns {Promise<Array>}
   */
  async getActivitiesByChild (childId) {
    return this.getActivities({ child_id: childId })
  }

  /**
   * Activités en retard
   * @returns {Promise<Array>}
   */
  async getOverdueActivities () {
    const activities = await this.getActivities()
    const now = new Date()

    return activities.filter(activity => {
      if (!activity.due_date || activity.status === 'completed' || activity.status === 'cancelled') {
        return false
      }
      return new Date(activity.due_date) < now
    })
  }

  /**
   * Activités à venir (7 prochains jours)
   * @returns {Promise<Array>}
   */
  async getUpcomingActivities () {
    const activities = await this.getActivities()
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return activities.filter(activity => {
      if (!activity.due_date || activity.status === 'completed' || activity.status === 'cancelled') {
        return false
      }
      const dueDate = new Date(activity.due_date)
      return dueDate >= now && dueDate <= nextWeek
    })
  }

  /**
   * Rechercher des activités
   * @param {string} query
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async searchActivities (query, filters = {}) {
    return this.getActivities({ ...filters, search: query })
  }

  /**
   * Exporter les activités en CSV
   * @param {Array|null} activities
   * @returns {string}
   */
  exportToCSV (activities = null) {
    const data = activities || this.activities

    if (data.length === 0) {
      return 'Aucune donnée à exporter'
    }

    const headers = ['ID', 'Titre', 'Description', 'Enfant', 'Priorité', 'Statut', 'Date d\'échéance', 'Créée le']
    const csvContent = [
      headers.join(','),
      ...data.map(activity => [
        activity.id,
        `"${activity.title}"`,
        `"${(activity.description || '').replace(/"/g, '""')}"`,
        activity.child_id,
        activity.priority,
        activity.status,
        activity.due_date ? new Date(activity.due_date).toLocaleDateString('fr-FR') : '',
        new Date(activity.created_at).toLocaleDateString('fr-FR')
      ].join(','))
    ].join('\n')

    return csvContent
  }
}

// Créer une instance singleton
const activityService = new ActivityService()

export default activityService
export { ActivityService }
