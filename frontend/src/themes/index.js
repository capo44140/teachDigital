/**
 * Registre des thèmes de l'application.
 *
 * Un thème = une entrée de APP_THEMES (métadonnées : nom, aperçu, couleur de la barre d'état…)
 * + un fichier src/styles/themes/<id>.css qui redéfinit, sous :root[data-app-theme="<id>"],
 * les variables de l'interface (palette Tailwind --color-*, rayons --radius-*, variables --lg-*
 * et --td-*) et habille quelques éléments repères (fond, titres, cartes, logo).
 * Le thème par défaut (Liquid Glass) n'a pas de fichier : c'est le style de base de l'application.
 *
 * L'attribut data-app-theme est posé sur <html> par src/stores/themeStore.js et, avant le
 * premier rendu, par public/theme-boot.js. Guide complet : doc/THEMES.md.
 */

export const DEFAULT_THEME_ID = 'liquid-glass'

/**
 * @typedef {Object} ThemeTone - libellé d'une couleur préférée de l'enfant dans ce thème
 * @property {string} name
 * @property {string} emoji
 * @property {string} swatch - fond CSS de la pastille (les classes Tailwind suivent la palette du thème)
 *
 * @typedef {Object} AppTheme
 * @property {string} id - valeur de data-app-theme
 * @property {string} name
 * @property {string} emoji
 * @property {string} tagline
 * @property {string} description
 * @property {string} themeColor - <meta name="theme-color"> (barre d'état de la PWA)
 * @property {null|{ title: string, hint: string, options?: Object<string, ThemeTone> }} tones -
 *   la couleur préférée de l'enfant teinte-t-elle le fond ? (null : le thème l'ignore)
 * @property {Object} preview - couleurs de la miniature du sélecteur (ThemePicker)
 */

/** @type {ReadonlyArray<AppTheme>} */
export const APP_THEMES = Object.freeze([
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    emoji: '💎',
    tagline: 'Le thème d\'origine',
    description: 'Verre dépoli, dégradés violets et fond animé.',
    themeColor: '#4C1D95',
    tones: {
      title: 'Choisis ta couleur préférée',
      hint: 'Elle colore le fond de ton espace.'
    },
    preview: {
      background: 'linear-gradient(135deg, #0F172A 0%, #4C1D95 55%, #0F172A 100%)',
      surface: 'rgba(255, 255, 255, 0.12)',
      border: 'rgba(255, 255, 255, 0.22)',
      accent: 'linear-gradient(90deg, #A855F7, #EC4899)',
      text: '#FFFFFF',
      radius: '0.625rem',
      font: '\'Inter\', system-ui, sans-serif',
      titleFont: '\'Inter\', system-ui, sans-serif',
      titleWeight: 700
    }
  },
  {
    id: 'netflix',
    name: 'Netflix',
    emoji: '🍿',
    tagline: 'Soirée série',
    description: 'Noir profond, rouge cinéma et tuiles qui s\'agrandissent au survol.',
    themeColor: '#141414',
    tones: null,
    preview: {
      background: 'radial-gradient(120% 70% at 50% -10%, rgba(229, 9, 20, 0.45), transparent 60%), #141414',
      surface: '#262626',
      border: 'transparent',
      accent: '#E50914',
      text: '#FFFFFF',
      radius: '0.1875rem',
      font: '\'Helvetica Neue\', Helvetica, Arial, sans-serif',
      titleFont: '\'Bebas Neue\', \'Arial Narrow\', sans-serif',
      titleWeight: 400
    }
  },
  {
    id: 'paw-patrol',
    name: 'Pat\' Patrouille',
    emoji: '🐶',
    tagline: 'Aucune mission n\'est trop grande !',
    description: 'Ciel bleu, empreintes de pattes et couleurs des chiots.',
    themeColor: '#0D47A1',
    tones: {
      title: 'Choisis ton chiot préféré',
      hint: 'Ses couleurs décorent le ciel de ton espace.',
      options: {
        purple: { name: 'Everest', emoji: '🏔️', swatch: 'linear-gradient(135deg, #7E57C2, #26C6DA)' },
        blue: { name: 'Chase', emoji: '🚓', swatch: 'linear-gradient(135deg, #1E63C4, #64B5F6)' },
        green: { name: 'Rocky', emoji: '♻️', swatch: 'linear-gradient(135deg, #2E7D32, #81C784)' },
        orange: { name: 'Zuma', emoji: '🌊', swatch: 'linear-gradient(135deg, #EF6C00, #FFB74D)' },
        yellow: { name: 'Ruben', emoji: '🚧', swatch: 'linear-gradient(135deg, #F9A825, #FFEE58)' },
        rainbow: { name: 'Toute l\'équipe', emoji: '🏅', swatch: 'linear-gradient(135deg, #E53935, #FBC02D, #1E88E5)' }
      }
    },
    preview: {
      background: 'radial-gradient(circle at 85% 12%, rgba(255, 213, 79, 0.55), transparent 35%), linear-gradient(180deg, #1565C0, #0B3F94)',
      surface: 'rgba(6, 27, 74, 0.55)',
      border: 'rgba(255, 255, 255, 0.85)',
      accent: 'linear-gradient(90deg, #D32F2F, #D81B60)',
      text: '#FFFFFF',
      radius: '0.875rem',
      font: '\'Fredoka Variable\', \'Fredoka\', system-ui, sans-serif',
      titleFont: '\'Luckiest Guy\', \'Fredoka Variable\', system-ui, sans-serif',
      titleWeight: 400
    }
  },
  {
    id: 'desperate-housewives',
    name: 'Desperate Housewives',
    emoji: '🍎',
    tagline: 'Bienvenue à Wisteria Lane',
    description: 'Glycines, pomme rouge et élégance de banlieue chic.',
    themeColor: '#2A1028',
    tones: null,
    preview: {
      background: 'radial-gradient(circle at 85% 15%, rgba(255, 244, 214, 0.35), transparent 25%), linear-gradient(180deg, #1E0B1C, #3B1838)',
      surface: 'rgba(255, 240, 250, 0.09)',
      border: 'rgba(212, 175, 55, 0.6)',
      accent: 'linear-gradient(90deg, #8F4FA4, #C8102E)',
      text: '#FFF9F2',
      radius: '0.4375rem',
      font: '\'Inter\', system-ui, sans-serif',
      titleFont: '\'Playfair Display Variable\', \'Playfair Display\', Georgia, serif',
      titleWeight: 700
    }
  }
])

const THEMES_BY_ID = new Map(APP_THEMES.map(theme => [theme.id, theme]))

/**
 * @param {unknown} id
 * @returns {boolean} true si id désigne un thème du registre
 */
export function isAppThemeId (id) {
  return typeof id === 'string' && THEMES_BY_ID.has(id)
}

/**
 * Thème du registre (thème par défaut si l'identifiant est inconnu)
 * @param {unknown} id
 * @returns {AppTheme}
 */
export function getAppTheme (id) {
  return THEMES_BY_ID.get(id) || THEMES_BY_ID.get(DEFAULT_THEME_ID)
}
