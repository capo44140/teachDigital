/**
 * Service de gestion des activités
 * Gère les activités des enfants (devoirs, tâches, projets, etc.)
 */

class ActivityService {
  constructor () {
    this.baseUrl = '/api/activities' // URL de base pour les appels API
    this.activities = [] // Cache local des activités
  }

  /**
   * Récupérer toutes les activités
   * @param {Object} filters - Filtres optionnels (child_id, status, etc.)
   * @returns {Promise<Array>} Liste des activités
   */
  async getActivities (filters = {}) {
    try {
      // Dans une vraie application, ceci ferait un appel API
      // Pour l'instant, on simule avec des données locales
      const mockActivities = [
        {
          id: 1,
          title: 'Devoirs de mathématiques',
          description: 'Exercices de géométrie - Chapitre 5',
          child_id: 1,
          priority: 'high',
          status: 'active',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          title: 'Lecture quotidienne',
          description: 'Lire 30 minutes par jour',
          child_id: 1,
          priority: 'medium',
          status: 'completed',
          due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          title: 'Projet d\'histoire',
          description: 'Préparer la présentation sur la Révolution française',
          child_id: 2,
          priority: 'high',
          status: 'paused',
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 4,
          title: 'Exercices de français',
          description: 'Grammaire et conjugaison - Leçon 12',
          child_id: 2,
          priority: 'medium',
          status: 'active',
          due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      // Appliquer les filtres
      let filteredActivities = [...mockActivities]

      if (filters.child_id) {
        filteredActivities = filteredActivities.filter(activity => activity.child_id === filters.child_id)
      }

      if (filters.status) {
        filteredActivities = filteredActivities.filter(activity => activity.status === filters.status)
      }

      if (filters.priority) {
        filteredActivities = filteredActivities.filter(activity => activity.priority === filters.priority)
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredActivities = filteredActivities.filter(activity =>
          activity.title.toLowerCase().includes(searchTerm) ||
          activity.description.toLowerCase().includes(searchTerm)
        )
      }

      this.activities = filteredActivities
      return filteredActivities
    } catch (error) {
      console.error('Erreur lors de la récupération des activités:', error)
      throw error
    }
  }

  /**
   * Récupérer une activité par son ID
   * @param {number} id - ID de l'activité
   * @returns {Promise<Object|null>} L'activité ou null si non trouvée
   */
  async getActivityById (id) {
    try {
      const activities = await this.getActivities()
      return activities.find(activity => activity.id === id) || null
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'activité:', error)
      throw error
    }
  }

  /**
   * Créer une nouvelle activité
   * @param {Object} activityData - Données de l'activité
   * @returns {Promise<Object>} L'activité créée
   */
  async createActivity (activityData) {
    try {
      const newActivity = {
        id: Date.now(), // ID temporaire
        ...activityData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Dans une vraie application, ceci ferait un appel API POST
      // await fetch(`${this.baseUrl}`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newActivity)
      // })

      this.activities.push(newActivity)
      return newActivity
    } catch (error) {
      console.error('Erreur lors de la création de l\'activité:', error)
      throw error
    }
  }

  /**
   * Mettre à jour une activité
   * @param {number} id - ID de l'activité
   * @param {Object} updateData - Données à mettre à jour
   * @returns {Promise<Object>} L'activité mise à jour
   */
  async updateActivity (id, updateData) {
    try {
      const activityIndex = this.activities.findIndex(activity => activity.id === id)

      if (activityIndex === -1) {
        throw new Error('Activité non trouvée')
      }

      const updatedActivity = {
        ...this.activities[activityIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      }

      // Dans une vraie application, ceci ferait un appel API PUT
      // await fetch(`${this.baseUrl}/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updatedActivity)
      // })

      this.activities[activityIndex] = updatedActivity
      return updatedActivity
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'activité:', error)
      throw error
    }
  }

  /**
   * Supprimer une activité
   * @param {number} id - ID de l'activité
   * @returns {Promise<boolean>} True si supprimée avec succès
   */
  async deleteActivity (id) {
    try {
      const activityIndex = this.activities.findIndex(activity => activity.id === id)

      if (activityIndex === -1) {
        throw new Error('Activité non trouvée')
      }

      // Dans une vraie application, ceci ferait un appel API DELETE
      // await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' })

      this.activities.splice(activityIndex, 1)
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'activité:', error)
      throw error
    }
  }

  /**
   * Changer le statut d'une activité
   * @param {number} id - ID de l'activité
   * @param {string} status - Nouveau statut
   * @returns {Promise<Object>} L'activité mise à jour
   */
  async updateActivityStatus (id, status) {
    return this.updateActivity(id, { status })
  }

  /**
   * Récupérer les statistiques des activités
   * @param {number} childId - ID de l'enfant (optionnel)
   * @returns {Promise<Object>} Statistiques des activités
   */
  async getActivityStats (childId = null) {
    try {
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
          if (!a.due_date || a.status === 'completed') return false
          return new Date(a.due_date) < new Date()
        }).length
      }

      // Calculer le taux de complétion
      stats.completion_rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

      return stats
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error)
      throw error
    }
  }

  /**
   * Récupérer les activités par enfant
   * @param {number} childId - ID de l'enfant
   * @returns {Promise<Array>} Liste des activités de l'enfant
   */
  async getActivitiesByChild (childId) {
    return this.getActivities({ child_id: childId })
  }

  /**
   * Récupérer les activités en retard
   * @returns {Promise<Array>} Liste des activités en retard
   */
  async getOverdueActivities () {
    try {
      const activities = await this.getActivities()
      const now = new Date()

      return activities.filter(activity => {
        if (!activity.due_date || activity.status === 'completed' || activity.status === 'cancelled') {
          return false
        }
        return new Date(activity.due_date) < now
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des activités en retard:', error)
      throw error
    }
  }

  /**
   * Récupérer les activités à venir (prochaines 7 jours)
   * @returns {Promise<Array>} Liste des activités à venir
   */
  async getUpcomingActivities () {
    try {
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
    } catch (error) {
      console.error('Erreur lors de la récupération des activités à venir:', error)
      throw error
    }
  }

  /**
   * Rechercher des activités
   * @param {string} query - Terme de recherche
   * @param {Object} filters - Filtres additionnels
   * @returns {Promise<Array>} Liste des activités correspondantes
   */
  async searchActivities (query, filters = {}) {
    return this.getActivities({ ...filters, search: query })
  }

  /**
   * Exporter les activités en CSV
   * @param {Array} activities - Liste des activités à exporter
   * @returns {string} Contenu CSV
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
        `"${activity.description}"`,
        activity.child_id,
        activity.priority,
        activity.status,
        activity.due_date ? new Date(activity.due_date).toLocaleDateString('fr-FR') : '',
        new Date(activity.created_at).toLocaleDateString('fr-FR')
      ].join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * Sauvegarder les activités dans le localStorage
   * @returns {Promise<boolean>} True si sauvegardé avec succès
   */
  async saveToLocalStorage () {
    try {
      localStorage.setItem('activities', JSON.stringify(this.activities))
      return true
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      return false
    }
  }

  /**
   * Charger les activités depuis le localStorage
   * @returns {Promise<Array>} Liste des activités chargées
   */
  async loadFromLocalStorage () {
    try {
      const saved = localStorage.getItem('activities')
      if (saved) {
        this.activities = JSON.parse(saved)
        return this.activities
      }
      return []
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      return []
    }
  }
}

// Créer une instance singleton
const activityService = new ActivityService()

export default activityService
export { ActivityService }
