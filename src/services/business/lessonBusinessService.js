import { LessonService } from '../lessonService.js';
import { LessonRepository } from '../../repositories/lessonRepository.js';
import { QuizRepository } from '../../repositories/quizRepository.js';
import { NotificationService } from '../notificationService.js';
import { auditLogService } from '../auditLogService.js';

/**
 * Service de logique métier pour les leçons et quiz
 * Contient la logique complexe et les règles métier
 */
export class LessonBusinessService {
  constructor() {
    this.lessonRepository = new LessonRepository();
    this.quizRepository = new QuizRepository();
  }

  /**
   * Créer une leçon avec validation et traitement
   * @param {Object} lessonData - Données de la leçon
   * @param {number} profileId - ID du profil
   * @param {File} imageFile - Fichier image (optionnel)
   * @returns {Promise<Object>} Leçon créée
   */
  async createLessonWithValidation(lessonData, profileId, imageFile = null) {
    try {
      // Validation des données
      this.validateLessonData(lessonData);
      
      // Traitement de l'image si fournie
      let imageFilename = null;
      let imageData = null;
      
      if (imageFile) {
        this.validateImageFile(imageFile);
        imageData = await LessonService.fileToBase64(imageFile);
        imageFilename = imageFile.name;
      }
      
      // Créer la leçon
      const newLesson = await this.lessonRepository.createLesson(
        lessonData, 
        profileId, 
        imageFilename, 
        imageData
      );
      
      // Enregistrer dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'lesson_creation',
        'LESSON_CREATED',
        {
          lessonId: newLesson.id,
          title: lessonData.title,
          questionsCount: lessonData.questions?.length || 0
        }
      );
      
      return newLesson;
    } catch (error) {
      console.error('Erreur lors de la création de la leçon:', error);
      throw error;
    }
  }

  /**
   * Traiter les résultats d'un quiz avec calculs et notifications
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil
   * @param {Array} answers - Réponses du quiz
   * @param {Array} questions - Questions du quiz
   * @returns {Promise<Object>} Résultats traités
   */
  async processQuizResults(lessonId, profileId, answers, questions) {
    try {
      // Calculer le score
      const results = this.calculateQuizScore(answers, questions);
      
      // Sauvegarder les résultats
      const savedResults = await this.quizRepository.saveQuizResults(
        lessonId, 
        profileId, 
        results
      );
      
      // Enregistrer dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'quiz_completion',
        'QUIZ_COMPLETED',
        {
          lessonId,
          score: results.score,
          percentage: results.percentage
        }
      );
      
      // Récupérer les informations de la leçon pour la notification
      const lesson = await this.lessonRepository.findLessonById(lessonId);
      
      // Créer une notification de quiz terminé
      await NotificationService.createQuizCompletionNotification(profileId, {
        score: results.score,
        totalQuestions: results.totalQuestions,
        percentage: results.percentage,
        lessonTitle: lesson?.title || 'Quiz'
      });
      
      return savedResults;
    } catch (error) {
      console.error('Erreur lors du traitement des résultats de quiz:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques détaillées d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques détaillées
   */
  async getDetailedProfileStats(profileId) {
    try {
      // Statistiques de base
      const basicStats = await this.quizRepository.getProfileStats(profileId);
      
      // Récupérer toutes les leçons disponibles
      const allLessons = await this.lessonRepository.findAvailableLessons();
      
      // Enrichir les leçons avec les résultats de quiz
      const enrichedLessons = await Promise.all(
        allLessons.map(async (lesson) => {
          const quizResults = await this.quizRepository.getQuizResults(lesson.id, profileId);
          const bestResult = quizResults.length > 0 
            ? quizResults.reduce((best, current) => current.percentage > best.percentage ? current : best)
            : null;
          
          return {
            ...lesson,
            quizCompleted: quizResults.length > 0,
            bestScore: bestResult ? bestResult.percentage : 0,
            totalAttempts: quizResults.length,
            lastAttempt: quizResults.length > 0 ? quizResults[0].completed_at : null
          };
        })
      );
      
      // Historique des quiz (derniers 20)
      const quizHistory = [];
      for (const lesson of allLessons) {
        const results = await this.quizRepository.getQuizResults(lesson.id, profileId);
        results.forEach(result => {
          quizHistory.push({
            id: result.id,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            score: result.percentage,
            correctAnswers: result.score,
            totalQuestions: result.total_questions,
            completedAt: result.completed_at
          });
        });
      }
      
      // Trier l'historique par date (plus récent en premier)
      quizHistory.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      
      return {
        ...basicStats,
        lessons: enrichedLessons,
        quizHistory: quizHistory.slice(0, 20), // Limiter à 20 derniers quiz
        totalLessons: basicStats.total_lessons || 0,
        totalQuizzes: basicStats.total_quizzes_completed || 0,
        averageScore: basicStats.average_score || 0
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques détaillées:', error);
      throw error;
    }
  }

  /**
   * Supprimer une leçon avec vérifications de sécurité
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil (pour vérification)
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteLessonWithSecurity(lessonId, profileId) {
    try {
      // Vérifier que la leçon existe et appartient au profil
      const lesson = await this.lessonRepository.findLessonById(lessonId);
      if (!lesson) {
        throw new Error('Leçon non trouvée');
      }
      
      if (lesson.profile_id !== profileId) {
        throw new Error('Vous n\'êtes pas autorisé à supprimer cette leçon');
      }
      
      // Supprimer la leçon
      const success = await this.lessonRepository.deleteLesson(lessonId, profileId);
      
      if (success) {
        // Enregistrer dans les logs d'audit
        auditLogService.logDataAccess(
          profileId,
          'lesson_deletion',
          'LESSON_DELETED',
          { lessonId }
        );
      }
      
      return success;
    } catch (error) {
      console.error('Erreur lors de la suppression de la leçon:', error);
      throw error;
    }
  }

  /**
   * Valider les données d'une leçon
   * @param {Object} lessonData - Données à valider
   */
  validateLessonData(lessonData) {
    if (!lessonData.title || lessonData.title.trim().length < 3) {
      throw new Error('Le titre de la leçon doit contenir au moins 3 caractères');
    }
    
    if (!lessonData.questions || !Array.isArray(lessonData.questions) || lessonData.questions.length === 0) {
      throw new Error('La leçon doit contenir au moins une question');
    }
    
    // Valider chaque question
    lessonData.questions.forEach((question, index) => {
      if (!question.question || question.question.trim().length < 5) {
        throw new Error(`La question ${index + 1} doit contenir au moins 5 caractères`);
      }
      
      if (!question.answers || !Array.isArray(question.answers) || question.answers.length < 2) {
        throw new Error(`La question ${index + 1} doit avoir au moins 2 réponses`);
      }
      
      if (question.correctAnswer === undefined || question.correctAnswer < 0 || question.correctAnswer >= question.answers.length) {
        throw new Error(`La question ${index + 1} doit avoir une réponse correcte valide`);
      }
    });
  }

  /**
   * Valider un fichier image
   * @param {File} file - Fichier à valider
   */
  validateImageFile(file) {
    if (!LessonService.validateImageType(file)) {
      throw new Error('Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP');
    }
    
    if (!LessonService.validateImageSize(file)) {
      throw new Error('Le fichier est trop volumineux. Taille maximum : 5MB');
    }
  }

  /**
   * Calculer le score d'un quiz
   * @param {Array} answers - Réponses de l'utilisateur
   * @param {Array} questions - Questions du quiz
   * @returns {Object} Résultats calculés
   */
  calculateQuizScore(answers, questions) {
    let score = 0;
    const totalQuestions = questions.length;
    
    // Vérifier chaque réponse
    answers.forEach((userAnswer, index) => {
      if (index < questions.length) {
        const question = questions[index];
        if (userAnswer === question.correctAnswer) {
          score++;
        }
      }
    });
    
    const percentage = Math.round((score / totalQuestions) * 100);
    
    return {
      score,
      totalQuestions,
      percentage,
      answers: answers.map((answer, index) => ({
        questionIndex: index,
        userAnswer: answer,
        correctAnswer: questions[index]?.correctAnswer,
        isCorrect: answer === questions[index]?.correctAnswer
      }))
    };
  }

  /**
   * Obtenir les recommandations de leçons pour un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Leçons recommandées
   */
  async getRecommendedLessons(profileId) {
    try {
      // Récupérer l'historique des quiz du profil
      const quizHistory = await this.quizRepository.getChildQuizHistory(profileId);
      
      // Récupérer toutes les leçons disponibles
      const allLessons = await this.lessonRepository.findAvailableLessons();
      
      // Identifier les sujets où l'utilisateur a des difficultés (score < 60%)
      const difficultSubjects = new Set();
      quizHistory.forEach(quiz => {
        if (quiz.percentage < 60) {
          difficultSubjects.add(quiz.lessonSubject);
        }
      });
      
      // Recommander des leçons dans les sujets difficiles
      const recommendedLessons = allLessons.filter(lesson => 
        difficultSubjects.has(lesson.subject) && 
        !quizHistory.some(quiz => quiz.lessonId === lesson.id)
      );
      
      return recommendedLessons.slice(0, 5); // Limiter à 5 recommandations
    } catch (error) {
      console.error('Erreur lors du calcul des recommandations:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques de progression d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques de progression
   */
  async getProgressStats(profileId) {
    try {
      const quizHistory = await this.quizRepository.getChildQuizHistory(profileId);
      const allLessons = await this.lessonRepository.findAvailableLessons();
      
      // Calculer la progression par sujet
      const subjectProgress = {};
      allLessons.forEach(lesson => {
        if (!subjectProgress[lesson.subject]) {
          subjectProgress[lesson.subject] = {
            totalLessons: 0,
            completedLessons: 0,
            averageScore: 0,
            scores: []
          };
        }
        subjectProgress[lesson.subject].totalLessons++;
        
        const subjectQuizzes = quizHistory.filter(quiz => quiz.lessonSubject === lesson.subject);
        if (subjectQuizzes.length > 0) {
          subjectProgress[lesson.subject].completedLessons++;
          const scores = subjectQuizzes.map(quiz => quiz.percentage);
          subjectProgress[lesson.subject].scores = scores;
          subjectProgress[lesson.subject].averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        }
      });
      
      return {
        subjectProgress,
        totalLessons: allLessons.length,
        completedLessons: new Set(quizHistory.map(quiz => quiz.lessonId)).size,
        overallProgress: (new Set(quizHistory.map(quiz => quiz.lessonId)).size / allLessons.length) * 100
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques de progression:', error);
      throw error;
    }
  }
}
