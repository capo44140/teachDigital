/* global __APP_VERSION__ */
/**
 * Remontée des erreurs JavaScript non interceptées (action d'audit CLIENT_ERROR).
 *
 * - Envoi uniquement avec un jeton (auditLogService s'en charge) ;
 * - détails courts (message tronqué, page, version) : aucune donnée de formulaire ;
 * - limité : une même erreur n'est envoyée qu'une fois, au plus une toutes les
 *   10 secondes et 10 par chargement de page.
 */

import { auditLogService } from './auditLogService.js'

const MIN_INTERVAL_MS = 10 * 1000
const MAX_REPORTS_PER_PAGE = 10
const MAX_MESSAGE_LENGTH = 300

const APP_BUILD = typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? String(__APP_VERSION__) : 'dev'

let lastReportAt = 0
let reportCount = 0
const reportedSignatures = new Set()

function truncate (value, max = MAX_MESSAGE_LENGTH) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/**
 * Décrire brièvement une erreur (message + nom)
 * @param {unknown} error
 */
export function summarizeError (error) {
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: truncate(error.message || error.name) }
  }
  if (typeof error === 'string') return { name: 'Error', message: truncate(error) }
  try {
    return { name: 'Error', message: truncate(JSON.stringify(error)) }
  } catch {
    return { name: 'Error', message: 'Erreur non sérialisable' }
  }
}

/**
 * Signaler une erreur client au serveur (si possible et pas trop souvent)
 * @param {unknown} error
 * @param {{ source?: string, info?: string }} context - origine (vue, unhandledrejection, window)
 * @returns {boolean} true si un envoi a été tenté
 */
export function reportClientError (error, context = {}) {
  const { name, message } = summarizeError(error)
  const signature = `${context.source || 'unknown'}|${name}|${message}`
  const now = Date.now()

  if (reportedSignatures.has(signature)) return false
  if (reportCount >= MAX_REPORTS_PER_PAGE) return false
  if (now - lastReportAt < MIN_INTERVAL_MS) return false

  reportedSignatures.add(signature)
  reportCount++
  lastReportAt = now

  auditLogService.logClientError({
    name,
    message,
    source: context.source || 'unknown',
    info: context.info ? truncate(context.info, 100) : undefined,
    route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    build: APP_BUILD
  })
  return true
}

/**
 * Réinitialiser la limitation (tests)
 */
export function resetClientErrorReporter () {
  lastReportAt = 0
  reportCount = 0
  reportedSignatures.clear()
}
