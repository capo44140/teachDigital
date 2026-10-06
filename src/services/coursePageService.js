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

export const PROGRESS_MESSAGE_TYPE = 'teachdigital:quiz-progress'

// Script injecté dans la page isolée : remonte le score du quiz à l'application.
// Deux sources : les compteurs #sOk / #sTot / #sStreak des pages générées,
// ou un appel explicite à window.TeachDigital.report(ok, total, streak).
const PROGRESS_BRIDGE = `<script>(function(){
if(window.parent===window)return;
var last=null;
function num(id){var el=document.getElementById(id);if(!el)return null;var v=parseInt(el.textContent,10);return isNaN(v)?null:v}
function send(ok,total,streak){if(!(total>0)||!(ok>=0)||ok>total)return;var key=ok+'/'+total;if(key===last)return;last=key;
window.parent.postMessage({type:'${PROGRESS_MESSAGE_TYPE}',ok:ok,total:total,streak:streak>0?streak:0},'*')}
window.TeachDigital={report:function(ok,total,streak){send(+ok,+total,+streak)}};
function fromDom(){var ok=num('sOk'),total=num('sTot');if(ok!==null&&total!==null)send(ok,total,num('sStreak')||0)}
function watch(){var el=document.getElementById('sTot');if(!el)return false;
new MutationObserver(fromDom).observe(el,{childList:true,characterData:true,subtree:true});return true}
if(!watch())document.addEventListener('DOMContentLoaded',watch);
})();</script>`

/**
 * Ajoute le pont de progression à une page de cours (avant </body> si présent)
 */
export function withProgressBridge (html) {
  const match = /<\/body\s*>/i.exec(html)
  if (!match) return html + PROGRESS_BRIDGE
  return html.slice(0, match.index) + PROGRESS_BRIDGE + html.slice(match.index)
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
