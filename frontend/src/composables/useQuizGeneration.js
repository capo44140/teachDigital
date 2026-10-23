import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LessonService } from '../services/lessonService.js'
import { auditLogService } from '../services/auditLogService.js'
import { describeError } from '../utils/apiErrors.js'
import { AI_TIMEOUT_MESSAGE } from '../constants/aiLimits.js'

/**
 * Parcours commun « générer un quiz par l'IA → l'enregistrer → l'ouvrir en aperçu parent »,
 * partagé par le scanner de leçons (photos) et le générateur à partir de texte.
 *
 * - Les limites de requêtes sont appliquées par le serveur (429 + retryAfterSeconds).
 * - La leçon est enregistrée par un seul POST (aucun nouvel essai automatique → pas de doublon).
 * - Seul l'identifiant de la leçon passe dans l'URL : QuizGenerator recharge la leçon.
 */

function formatWait (seconds) {
  if (seconds < 60) return `${seconds} s`
  return `${Math.ceil(seconds / 60)} min`
}

/**
 * Message lisible pour une erreur de génération
 * @returns {{ message: string, requestId: string|null }}
 */
export function describeGenerationError (error) {
  const { message, requestId } = describeError(error, 'Erreur lors de la génération du quiz. Veuillez réessayer.')
  if (error?.status === 429) {
    const wait = Number(error.retryAfterSeconds)
    return {
      message: wait > 0
        ? `Limite de générations atteinte. Réessayez dans ${formatWait(wait)}.`
        : 'Limite de générations atteinte. Réessayez dans quelques instants.',
      requestId
    }
  }
  if (error?.code === 'AI_TIMEOUT') {
    return { message: AI_TIMEOUT_MESSAGE, requestId }
  }
  if (error?.status === 415 || error?.code === 'UNSUPPORTED_FILE_TYPE') {
    return {
      message: message || 'Format de fichier non pris en charge : utilisez des images (JPG, PNG ou WebP).',
      requestId
    }
  }
  return { message, requestId }
}

/**
 * Vérifier qu'un quiz généré est exploitable
 * @throws {Error} si le quiz est vide ou mal formé
 */
export function assertValidQuiz (quiz) {
  const questions = quiz?.questions
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Le quiz généré est vide ou invalide. Veuillez réessayer.')
  }
  return quiz
}

export function useQuizGeneration ({ source = 'scanner' } = {}) {
  const router = useRouter()
  const isProcessing = ref(false)
  const errorMessage = ref('')
  const errorReference = ref(null)

  // Actions d'audit QUIZ_GENERATION_START / SUCCESS / FAILED (source : scanner ou texte)
  const logGeneration = (child, phase, details = {}) => {
    auditLogService.logQuizGeneration(phase, child?.id, { source, ...details })
  }

  /**
   * Enregistrer la leçon générée pour l'enfant
   * @param {Object} quiz
   * @param {Object} child
   * @param {{ files?: File[], lesson?: Object }} options - lesson : champs à fusionner (titre, matière…)
   */
  const saveGeneratedLesson = (quiz, child, { files = null, lesson = {} } = {}) =>
    LessonService.saveLesson({ ...quiz, ...lesson }, child.id, files)

  /**
   * Exécuter une génération complète
   * @param {Object} params
   * @param {Object} params.child - profil enfant ciblé
   * @param {Object} [params.details] - détails d'audit (sans données personnelles volumineuses)
   * @param {Function} params.task - async () => { quiz, lesson } ; réalise génération + enregistrement
   * @returns {Promise<{ quiz: Object, lesson: Object }|null>} null en cas d'échec (errorMessage renseigné)
   */
  const runGeneration = async ({ child, details = {}, task }) => {
    if (isProcessing.value) return null
    isProcessing.value = true
    errorMessage.value = ''
    errorReference.value = null

    logGeneration(child, 'START', details)
    try {
      const outcome = await task()
      logGeneration(child, 'SUCCESS', {
        quizQuestions: outcome?.quiz?.questions?.length || 0,
        lessonId: outcome?.lesson?.id
      })
      return outcome
    } catch (error) {
      const { message, requestId } = describeGenerationError(error)
      errorMessage.value = message
      errorReference.value = requestId
      logGeneration(child, 'FAILED', { error: message, status: error?.status || null })
      return null
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Ouvrir le quiz enregistré en aperçu (seuls childId et lessonId passent dans l'URL)
   */
  const openQuizPreview = (child, lessonId) => router.push({
    name: 'QuizGenerator',
    query: { childId: String(child.id), lessonId: String(lessonId) }
  })

  return {
    isProcessing,
    errorMessage,
    errorReference,
    runGeneration,
    saveGeneratedLesson,
    openQuizPreview,
    assertValidQuiz
  }
}
