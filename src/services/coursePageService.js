/**
 * Pages de cours HTML (fiches de révision avec quiz intégrés)
 * Lecture des fichiers déposés par le parent et extraction de leurs métadonnées
 */

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
