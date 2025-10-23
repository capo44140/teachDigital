import { defineStore } from 'pinia';
import { LessonService } from '../services/lessonService.js';

/**
 * Store pour la gestion des leÃ§ons et quiz
 * GÃ¨re l'Ã©tat des leÃ§ons, quiz et statistiques
 */
export const useLessonStore = defineStore('lesson', {
  state: () => ({
    lessons: [],
    currentLesson: null,
    quizResults: [],
    quizHistory: [],
    stats: {
      totalLessons: 0,
      totalQuizzes: 0,
      averageScore: 0,
      lastQuizDate: null
    },
    isLoading: false,
    error: null,  }),

  getters: {
    // RÃ©cupÃ©rer les leÃ§ons disponibles
    availableLessons: (state) => state.lessons.filter(lesson => lesson.is_published),
    
    // RÃ©cupÃ©rer les leÃ§ons d'un profil
    lessonsByProfile: (state) => (profileId) => 
      state.lessons.filter(lesson => lesson.profile_id === profileId),
    
    // RÃ©cupÃ©rer les leÃ§ons par sujet
    lessonsBySubject: (state) => (subject) => 
      state.lessons.filter(lesson => lesson.subject === subject),
    
    // RÃ©cupÃ©rer les leÃ§ons par niveau
    lessonsByLevel: (state) => (level) => 
      state.lessons.filter(lesson => lesson.level === level),
    
    // RÃ©cupÃ©rer les quiz terminÃ©s
    completedQuizzes: (state) => state.quizResults.filter(result => result.completed_at),
    
    // RÃ©cupÃ©rer les quiz d'un profil
    quizzesByProfile: (state) => (profileId) => 
      state.quizResults.filter(result => result.profile_id === profileId),
    
    // RÃ©cupÃ©rer les meilleurs scores
    bestScores: (state) => 
      state.quizResults
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10),
    
    // VÃ©rifier si une leÃ§on a Ã©tÃ© complÃ©tÃ©e
    isLessonCompleted: (state) => (lessonId, profileId) => 
      state.quizResults.some(result => 
        result.lesson_id === lessonId && 
        result.profile_id === profileId
      ),
    
    // RÃ©cupÃ©rer le meilleur score pour une leÃ§on
    getBestScoreForLesson: (state) => (lessonId, profileId) => {
      const results = state.quizResults.filter(result => 
        result.lesson_id === lessonId && 
        result.profile_id === profileId
      );
      return results.length > 0 
        ? Math.max(...results.map(r => r.percentage))
        : 0;
    }
  },

  actions: {
    /**
     * Charger toutes les leÃ§ons disponibles
     */
    async loadLessons() {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.findAvailableLessons();
        console.log('âœ… LeÃ§ons chargÃ©es avec succÃ¨s');
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors du chargement des leÃ§ons:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Charger les leÃ§ons d'un profil
     * @param {number} profileId - ID du profil
     */
    async loadLessonsByProfile(profileId) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.findByProfileId(profileId);
        console.log('âœ… LeÃ§ons du profil chargÃ©es avec succÃ¨s');
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors du chargement des leÃ§ons du profil:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Charger une leÃ§on par ID
     * @param {number} lessonId - ID de la leÃ§on
     */
    async loadLesson(lessonId) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.currentLesson = await this.lessonRepository.findLessonById(lessonId);
        if (!this.currentLesson) {
          throw new Error('LeÃ§on non trouvÃ©e');
        }
        console.log('âœ… LeÃ§on chargÃ©e avec succÃ¨s');
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors du chargement de la leÃ§on:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * CrÃ©er une nouvelle leÃ§on
     * @param {Object} lessonData - DonnÃ©es de la leÃ§on
     * @param {number} profileId - ID du profil
     * @param {File} imageFile - Fichier image (optionnel)
     */
    async createLesson(lessonData, profileId, imageFile = null) {
      this.isLoading = true;
      this.error = null;
      
      try {
        let imageFilename = null;
        let imageData = null;
        
        if (imageFile) {
          imageData = await LessonService.fileToBase64(imageFile);
          imageFilename = imageFile.name;
        }
        
        const newLesson = await this.lessonRepository.createLesson(
          lessonData, 
          profileId, 
          imageFilename, 
          imageData
        );
        
        this.lessons.unshift(newLesson);
        console.log('âœ… LeÃ§on crÃ©Ã©e avec succÃ¨s');
        return newLesson;
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors de la crÃ©ation de la leÃ§on:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Supprimer une leÃ§on
     * @param {number} lessonId - ID de la leÃ§on
     * @param {number} profileId - ID du profil
     */
    async deleteLesson(lessonId, profileId) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const success = await this.lessonRepository.deleteLesson(lessonId, profileId);
        
        if (success) {
          this.lessons = this.lessons.filter(lesson => lesson.id !== lessonId);
          if (this.currentLesson && this.currentLesson.id === lessonId) {
            this.currentLesson = null;
          }
          console.log('âœ… LeÃ§on supprimÃ©e avec succÃ¨s');
        } else {
          throw new Error('LeÃ§on non trouvÃ©e ou non autorisÃ©e');
        }
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors de la suppression de la leÃ§on:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Sauvegarder les rÃ©sultats d'un quiz
     * @param {number} lessonId - ID de la leÃ§on
     * @param {number} profileId - ID du profil
     * @param {Object} results - RÃ©sultats du quiz
     */
    async saveQuizResults(lessonId, profileId, results) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const savedResults = await this.quizRepository.saveQuizResults(
          lessonId, 
          profileId, 
          results
        );
        
        // Mettre Ã  jour l'Ã©tat local
        this.quizResults.unshift(savedResults);
        
        // Recharger les statistiques
        await this.loadStats(profileId);
        
        console.log('âœ… RÃ©sultats de quiz sauvegardÃ©s avec succÃ¨s');
        return savedResults;
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors de la sauvegarde des rÃ©sultats:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Charger l'historique des quiz d'un profil
     * @param {number} profileId - ID du profil
     */
    async loadQuizHistory(profileId) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.quizHistory = await this.quizRepository.getChildQuizHistory(profileId);
        console.log('âœ… Historique des quiz chargÃ© avec succÃ¨s');
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors du chargement de l\'historique:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Charger les statistiques d'un profil
     * @param {number} profileId - ID du profil
     */
    async loadStats(profileId) {
      try {
        this.stats = await this.quizRepository.getProfileStats(profileId);
        console.log('âœ… Statistiques chargÃ©es avec succÃ¨s');
      } catch (error) {
        console.error('âŒ Erreur lors du chargement des statistiques:', error);
      }
    },

    /**
     * Charger les statistiques globales
     */
    async loadGlobalStats() {
      try {
        this.stats = await this.quizRepository.getGlobalStats();
        console.log('âœ… Statistiques globales chargÃ©es avec succÃ¨s');
      } catch (error) {
        console.error('âŒ Erreur lors du chargement des statistiques globales:', error);
      }
    },

    /**
     * Rechercher des leÃ§ons
     * @param {string} searchTerm - Terme de recherche
     */
    async searchLessons(searchTerm) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.searchLessons(searchTerm);
        console.log('âœ… Recherche de leÃ§ons terminÃ©e');
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors de la recherche:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Filtrer les leÃ§ons par sujet
     * @param {string} subject - Sujet des leÃ§ons
     */
    async filterBySubject(subject) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.findBySubject(subject);
        console.log('âœ… Filtrage par sujet terminÃ©');
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors du filtrage:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Filtrer les leÃ§ons par niveau
     * @param {string} level - Niveau des leÃ§ons
     */
    async filterByLevel(level) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.findByLevel(level);
        console.log('âœ… Filtrage par niveau terminÃ©');
      } catch (error) {
        this.error = error.message;
        console.error('âŒ Erreur lors du filtrage:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Nettoyer les erreurs
     */
    clearError() {
      this.error = null;
    },

    /**
     * RÃ©initialiser l'Ã©tat
     */
    reset() {
      this.lessons = [];
      this.currentLesson = null;
      this.quizResults = [];
      this.quizHistory = [];
      this.stats = {
        totalLessons: 0,
        totalQuizzes: 0,
        averageScore: 0,
        lastQuizDate: null
      };
      this.isLoading = false;
      this.error = null;
    }
  }
});


