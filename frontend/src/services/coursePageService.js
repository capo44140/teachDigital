/**
 * Pages de cours HTML (fiches de révision avec quiz intégrés)
 * Endpoints /api/course-pages (liste, lecture, publication, sessions de révision),
 * lecture des fichiers déposés par le parent, extraction de leurs métadonnées
 * et URL d'affichage isolé
 */

import { apiService, buildQuery } from './apiService.js'

// Aligné sur MAX_COURSE_PAGE_HTML_LENGTH côté backend
export const MAX_COURSE_PAGE_SIZE = 5 * 1024 * 1024

export const COURSE_SUBJECTS = [
  'Mathématiques',
  'Français',
  'Physique-chimie',
  'SVT',
  'Histoire-géographie',
  'Anglais',
  'Espagnol',
  'Technologie',
  'EMC'
]

// Mots-clés cherchés dans le titre et la description pour préremplir la matière
const SUBJECT_KEYWORDS = [
  ['Physique-chimie', /physique|chimie/],
  ['SVT', /\bsvt\b|sciences de la vie/],
  ['Mathématiques', /math|calcul|fraction|géométrie|équation/],
  ['Français', /français|grammaire|conjugaison|orthographe|phrase/],
  ['Histoire-géographie', /histoire|géographie|géo\b/],
  ['Anglais', /anglais|english/],
  ['Espagnol', /espagnol/],
  ['Technologie', /technologie/],
  ['EMC', /\bemc\b|enseignement moral/]
]

const cleanText = text => (text || '').replace(/\s+/g, ' ').trim()

/**
 * Devine la matière à partir d'un texte (titre, description)
 * @returns {string} Matière trouvée, ou chaîne vide
 */
export function guessSubject (text) {
  const lower = (text || '').toLowerCase()
  const match = SUBJECT_KEYWORDS.find(([, pattern]) => pattern.test(lower))
  return match ? match[0] : ''
}

/**
 * Extrait titre, description et matière d'une page HTML
 * Titre : <title>, sinon premier <h1>, sinon nom du fichier
 * Description : meta description, sinon premier paragraphe de l'en-tête
 */
export function extractCoursePageMetadata (html, fileName = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const title = cleanText(doc.querySelector('title')?.textContent) ||
    cleanText(doc.querySelector('h1')?.textContent) ||
    cleanText(fileName.replace(/\.html?$/i, ''))

  const description = cleanText(doc.querySelector('meta[name="description"]')?.getAttribute('content')) ||
    cleanText(doc.querySelector('header p')?.textContent)

  return {
    title: title.slice(0, 255),
    description: description.slice(0, 2000),
    subject: guessSubject(`${title} ${description}`)
  }
}

// ─── Endpoints /api/course-pages ────────────────────────────────────────────

/**
 * Pages de cours (sans leur contenu HTML)
 * @param {{ targetProfileId?: number, published?: boolean }} filters
 * @returns {Promise<Array>}
 */
export async function getCoursePages (filters = {}) {
  const response = await apiService.request(`/api/course-pages${buildQuery(filters)}`)
  return response.success ? response.data.coursePages : []
}

/**
 * Page de cours avec son contenu HTML
 * @returns {Promise<Object|null>}
 */
export async function getCoursePage (id) {
  const response = await apiService.request(`/api/course-pages/${id}`)
  return response.success ? response.data.coursePage : null
}

/**
 * Publier une page de cours pour un enfant
 * @returns {Promise<Object|null>}
 */
export async function createCoursePage (coursePageData) {
  const response = await apiService.request('/api/course-pages', {
    method: 'POST',
    body: JSON.stringify(coursePageData)
  })
  return response.success ? response.data.coursePage : null
}

/**
 * Modifier une page de cours (titre, contenu, visibilité...)
 * @returns {Promise<Object|null>}
 */
export async function updateCoursePage (id, coursePageData) {
  const response = await apiService.request(`/api/course-pages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(coursePageData)
  })
  return response.success ? response.data.coursePage : null
}

/**
 * Supprimer une page de cours
 * @returns {Promise<boolean>}
 */
export async function deleteCoursePage (id) {
  const response = await apiService.request(`/api/course-pages/${id}`, { method: 'DELETE' })
  return response.success
}

/**
 * Enregistrer une session de révision sur une page de cours (première sauvegarde).
 * keepalive : la requête part même si la page se ferme.
 */
export async function saveCoursePageResult (coursePageId, resultData, { keepalive = false } = {}) {
  const response = await apiService.request(`/api/course-pages/${coursePageId}/results`, {
    method: 'POST',
    body: JSON.stringify(resultData),
    keepalive
  })
  return response.success ? response.data : null
}

/**
 * Mettre à jour une session de révision en cours.
 * keepalive : la requête part même si la page se ferme.
 */
export async function updateCoursePageResult (coursePageId, resultId, resultData, { keepalive = false } = {}) {
  const response = await apiService.request(`/api/course-pages/${coursePageId}/results/${resultId}`, {
    method: 'PUT',
    body: JSON.stringify(resultData),
    keepalive
  })
  return response.success ? response.data : null
}

// Type des messages envoyés par le pont de progression, que le serveur ajoute
// à chaque page servie (backend/lib/coursePageView.js)
export const PROGRESS_MESSAGE_TYPE = 'teachdigital:quiz-progress'

/**
 * URL d'affichage isolé d'une page enregistrée (valable 10 min, le temps que l'iframe la charge).
 * La page est servie par le backend avec sa propre CSP « sandbox » : l'application garde
 * une CSP stricte, sans 'unsafe-inline'.
 * @returns {Promise<string>}
 */
export async function getCoursePageViewUrl (id) {
  const response = await apiService.request(`/api/course-pages/${id}/view`, { method: 'POST' })
  return response.data.url
}

/**
 * URL d'aperçu d'un brouillon non publié (parent uniquement)
 * @returns {Promise<string>}
 */
export async function getCoursePagePreviewUrl (htmlContent) {
  const response = await apiService.request('/api/course-pages/preview', {
    method: 'POST',
    body: JSON.stringify({ htmlContent })
  })
  return response.data.url
}

/**
 * Valide un message de progression reçu de la page isolée
 * @returns {{ok:number,total:number,streak:number}|null}
 */
export function parseProgressMessage (data) {
  if (!data || data.type !== PROGRESS_MESSAGE_TYPE) return null
  const ok = Number(data.ok)
  const total = Number(data.total)
  const streak = Number(data.streak) || 0
  if (!Number.isInteger(ok) || !Number.isInteger(total) || total < 1 || ok < 0 || ok > total) return null
  return { ok, total, streak: Math.max(0, streak) }
}

/**
 * Lit un fichier .html déposé par le parent
 * @param {File} file
 * @returns {Promise<{fileName, size, html, title, description, subject}>}
 * @throws {Error} Message lisible si le fichier n'est pas utilisable
 */
export async function readCoursePageFile (file) {
  if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
    throw new Error(`« ${file.name} » n'est pas une page HTML (.html)`)
  }
  if (file.size > MAX_COURSE_PAGE_SIZE) {
    throw new Error(`« ${file.name} » est trop volumineux (5 Mo maximum)`)
  }

  const html = await file.text()
  if (!html.trim()) {
    throw new Error(`« ${file.name} » est vide`)
  }

  return {
    fileName: file.name,
    size: file.size,
    html,
    ...extractCoursePageMetadata(html, file.name)
  }
}
