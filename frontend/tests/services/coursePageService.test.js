import { describe, it, expect } from 'vitest'
import {
  extractCoursePageMetadata,
  guessSubject,
  readCoursePageFile,
  MAX_COURSE_PAGE_SIZE
} from '../../src/services/coursePageService.js'

// Même structure que les pages générées : <title> placé dans le <body>
const SAMPLE_PAGE = `<!doctype html><html><head><meta charset=utf8><style>body{margin:0}</style></head><body>
<title>Les molécules</title>
<div class="wrap"><header>
  <h1>Les molécules</h1>
  <p>Révision de l'interro de physique-chimie, chapitre 1.
     Le modèle moléculaire, puis l'entraînement.</p>
</header><script>const ok = 0</script></div></body></html>`

const htmlFile = (content, name = 'page.html', type = 'text/html') => {
  const file = new File([content], name, { type })
  // jsdom n'implémente pas Blob.text()
  file.text = async () => content
  return file
}

describe('coursePageService', () => {
  describe('extractCoursePageMetadata', () => {
    it('lit le titre, la description de l\'en-tête et devine la matière', () => {
      expect(extractCoursePageMetadata(SAMPLE_PAGE)).toEqual({
        title: 'Les molécules',
        description: 'Révision de l\'interro de physique-chimie, chapitre 1. Le modèle moléculaire, puis l\'entraînement.',
        subject: 'Physique-chimie'
      })
    })

    it('préfère la meta description quand elle existe', () => {
      const html = '<head><meta name="description" content="Fiche de SVT"></head><body><header><p>Autre</p></header></body>'
      expect(extractCoursePageMetadata(html, 'stomates.html').description).toBe('Fiche de SVT')
    })

    it('se rabat sur le h1 puis sur le nom du fichier', () => {
      expect(extractCoursePageMetadata('<h1>Les stomates</h1>').title).toBe('Les stomates')
      expect(extractCoursePageMetadata('<p>Sans titre</p>', 'Phrase simple et complexe.html').title)
        .toBe('Phrase simple et complexe')
    })
  })

  describe('guessSubject', () => {
    it('reconnaît les matières courantes', () => {
      expect(guessSubject('Interro de cours de SVT')).toBe('SVT')
      expect(guessSubject('Phrase simple et complexe')).toBe('Français')
      expect(guessSubject('Calcul avec les nombres relatifs')).toBe('Mathématiques')
    })

    it('renvoie une chaîne vide sans indice', () => {
      expect(guessSubject('Les signes, sans se tromper')).toBe('')
    })
  })

  describe('readCoursePageFile', () => {
    it('lit un fichier .html', async () => {
      const page = await readCoursePageFile(htmlFile(SAMPLE_PAGE, 'Les molécules.html'))
      expect(page.fileName).toBe('Les molécules.html')
      expect(page.html).toBe(SAMPLE_PAGE)
      expect(page.title).toBe('Les molécules')
    })

    it('refuse un fichier qui n\'est pas une page HTML', async () => {
      await expect(readCoursePageFile(htmlFile('x', 'notes.pdf', 'application/pdf'))).rejects.toThrow('n\'est pas une page HTML')
    })

    it('refuse un fichier vide ou trop volumineux', async () => {
      await expect(readCoursePageFile(htmlFile('   '))).rejects.toThrow('est vide')
      const big = htmlFile('x')
      Object.defineProperty(big, 'size', { value: MAX_COURSE_PAGE_SIZE + 1 })
      await expect(readCoursePageFile(big)).rejects.toThrow('trop volumineux')
    })
  })
})
