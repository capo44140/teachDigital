import { defineStore } from 'pinia';
import { LessonService } from '../services/lessonService.js';
import { LessonRepository } from '../repositories/lessonRepository.js';
import { QuizRepository } from '../repositories/quizRepository.js';

/**
 * Store pour la gestion des leçons et quiz
 * Gère l'état des leçons, quiz et statistiques
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
    error: null,
    lessonRepository: new LessonRepository(),
    quizRepository: new QuizRepository()
  }),

  getters: {
    // Récupérer les leçons disponibles
    availableLessons: (state) => state.lessons.filter(lesson => lesson.is_published),
    
    // Récupérer les leçons d'un profil
    lessonsByProfile: (state) => (profileId) => 
      state.lessons.filter(lesson => lesson.profile_id === profileId),
    
    // Récupérer les leçons par sujet
    lessonsBySubject: (state) => (subject) => 
      state.lessons.filter(lesson => lesson.subject === subject),
    
    // Récupérer les leçons par niveau
    lessonsByLevel: (state) => (level) => 
      state.lessons.filter(lesson => lesson.level === level),
    
    // Récupérer les quiz terminés
    completedQuizzes: (state) => state.quizResults.filter(result => result.completed_at),
    
    // Récupérer les quiz d'un profil
    quizzesByProfile: (state) => (profileId) => 
      state.quizResults.filter(result => result.profile_id === profileId),
    
    // Récupérer les meilleurs scores
    bestScores: (state) => 
      state.quizResults
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10),
    
    // Vérifier si une leçon a été complétée
    isLessonCompleted: (state) => (lessonId, profileId) => 
      state.quizResults.some(result => 
        result.lesson_id === lessonId && 
        result.profile_id === profileId
      ),
    
    // Récupérer le meilleur score pour une leçon
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
     * Charger toutes les leçons disponibles
     */
    async loadLessons() {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.findAvailableLessons();
        console.log('✅ Leçons chargées avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du chargement des leçons:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Charger les leçons d'un profil
     * @param {number} profileId - ID du profil
     */
    async loadLessonsByProfile(profileId) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.findByProfileId(profileId);
        console.log('✅ Leçons du profil chargées avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du chargement des leçons du profil:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Charger une leçon par ID
     * @param {number} lessonId - ID de la leçon
     */
    async loadLesson(lessonId) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.currentLesson = await this.lessonRepository.findLessonById(lessonId);
        if (!this.currentLesson) {
          throw new Error('Leçon non trouvée');
        }
        console.log('✅ Leçon chargée avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du chargement de la leçon:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Créer une nouvelle leçon
     * @param {Object} lessonData - Données de la leçon
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
        console.log('✅ Leçon créée avec succès');
        return newLesson;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la création de la leçon:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Supprimer une leçon
     * @param {number} lessonId - ID de la leçon
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
          console.log('✅ Leçon supprimée avec succès');
        } else {
          throw new Error('Leçon non trouvée ou non autorisée');
        }
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la suppression de la leçon:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Sauvegarder les résultats d'un quiz
     * @param {number} lessonId - ID de la leçon
     * @param {number} profileId - ID du profil
     * @param {Object} results - Résultats du quiz
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
        
        // Mettre à jour l'état local
        this.quizResults.unshift(savedResults);
        
        // Recharger les statistiques
        await this.loadStats(profileId);
        
        console.log('✅ Résultats de quiz sauvegardés avec succès');
        return savedResults;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la sauvegarde des résultats:', error);
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
        console.log('✅ Historique des quiz chargé avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du chargement de l\'historique:', error);
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
        console.log('✅ Statistiques chargées avec succès');
      } catch (error) {
        console.error('❌ Erreur lors du chargement des statistiques:', error);
      }
    },

    /**
     * Charger les statistiques globales
     */
    async loadGlobalStats() {
      try {
        this.stats = await this.quizRepository.getGlobalStats();
        console.log('✅ Statistiques globales chargées avec succès');
      } catch (error) {
        console.error('❌ Erreur lors du chargement des statistiques globales:', error);
      }
    },

    /**
     * Rechercher des leçons
     * @param {string} searchTerm - Terme de recherche
     */
    async searchLessons(searchTerm) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.searchLessons(searchTerm);
        console.log('✅ Recherche de leçons terminée');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la recherche:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Filtrer les leçons par sujet
     * @param {string} subject - Sujet des leçons
     */
    async filterBySubject(subject) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.findBySubject(subject);
        console.log('✅ Filtrage par sujet terminé');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du filtrage:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Filtrer les leçons par niveau
     * @param {string} level - Niveau des leçons
     */
    async filterByLevel(level) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.lessons = await this.lessonRepository.findByLevel(level);
        console.log('✅ Filtrage par niveau terminé');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du filtrage:', error);
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
     * Réinitialiser l'état
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









