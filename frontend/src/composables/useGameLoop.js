import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Boucle d'animation et clavier d'un jeu, actifs tant que le composant est monté.
 * @param {(dt: number) => void} onFrame - appelé à chaque image ; dt en secondes (borné à 0,25 s)
 * @param {(event: KeyboardEvent) => boolean} [onKey] - renvoie true si la touche a servi
 *   (le défilement de la page ou l'activation d'un bouton est alors empêché)
 */
export function useGameLoop (onFrame, onKey) {
  let frame = null
  let last = null

  const loop = (time) => {
    const dt = last === null ? 0 : Math.min((time - last) / 1000, 0.25)
    last = time
    onFrame(dt)
    frame = window.requestAnimationFrame(loop)
  }

  const handleKey = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return
    if (onKey && onKey(event)) event.preventDefault()
  }

  onMounted(() => {
    if (typeof window.requestAnimationFrame === 'function') {
      frame = window.requestAnimationFrame(loop)
    }
    window.addEventListener('keydown', handleKey)
  })

  onBeforeUnmount(() => {
    if (frame !== null) window.cancelAnimationFrame(frame)
    window.removeEventListener('keydown', handleKey)
  })
}

/**
 * Prépare un canvas net sur les écrans haute densité ; renvoie son contexte 2D (null si indisponible)
 * @param {HTMLCanvasElement} canvas
 * @param {number} width - largeur logique (px)
 * @param {number} height - hauteur logique (px)
 */
export function setupCanvas (canvas, width, height) {
  if (!canvas) return null
  const ratio = Math.min(window.devicePixelRatio || 1, 3)
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  let ctx = null
  try {
    ctx = canvas.getContext('2d')
  } catch {
    ctx = null
  }
  if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  return ctx
}

/**
 * Direction d'un glissement du doigt (« up », « down », « left », « right »), ou null s'il est trop court
 */
export function swipeDirection (dx, dy, threshold = 18) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}
