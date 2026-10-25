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
 * @property {Object} preview - couleurs et polices de la miniature du sélecteur (ThemePicker) ;
 *   titleStyle et titleTransform sont facultatifs
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
  },
  {
    id: 'one-tree-hill',
    name: 'Les Frères Scott',
    emoji: '🏀',
    tagline: 'Bienvenue à Tree Hill',
    description: 'Coucher de soleil sur le River Court, l\'arbre sur la colline et le ballon orange.',
    themeColor: '#0D1730',
    tones: null,
    preview: {
      background: 'radial-gradient(circle at 30% 100%, rgba(255, 166, 94, 0.6), transparent 45%), linear-gradient(180deg, #0D1730, #3A2E52 70%, #5E3443)',
      surface: 'rgba(255, 228, 200, 0.1)',
      border: 'rgba(255, 170, 110, 0.45)',
      accent: 'linear-gradient(90deg, #B84E0F, #B8322F)',
      text: '#FFFFFF',
      radius: '0.5rem',
      font: '\'Inter\', system-ui, sans-serif',
      titleFont: '\'Permanent Marker\', \'Comic Sans MS\', cursive',
      titleWeight: 400
    }
  },
  {
    // Identifiant historique conservé (thème « Formule 1 » devenu Mercedes) : les choix
    // déjà enregistrés sur les appareils restent valables
    id: 'formula-1',
    name: 'Mercedes F1',
    emoji: '🏎️',
    tagline: 'Les Flèches d\'Argent',
    description: 'Noir carbone, argent métallisé, turquoise de l\'écurie et lignes de vitesse.',
    themeColor: '#0A0B0C',
    tones: null,
    preview: {
      background: 'radial-gradient(circle, rgba(200, 204, 206, 0.35) 1px, transparent 1.5px) 100% 0 / 7px 7px, linear-gradient(160deg, #0A0B0C 55%, #003431)',
      surface: '#1A1D1F',
      border: 'rgba(0, 210, 190, 0.8)',
      accent: 'linear-gradient(90deg, #00D2BE, #ABB1B5)',
      text: '#FFFFFF',
      radius: '0.125rem',
      font: '\'Titillium Web\', \'Segoe UI\', system-ui, sans-serif',
      titleFont: '\'Titillium Web\', \'Segoe UI\', system-ui, sans-serif',
      titleWeight: 700,
      titleTransform: 'uppercase'
    }
  },
  {
    id: 'aurora',
    name: 'Aurore boréale',
    emoji: '🌌',
    tagline: 'La magie du Grand Nord',
    description: 'Aurores boréales qui dansent, ciel étoilé et chalet douillet sous la neige.',
    themeColor: '#070B1F',
    tones: {
      title: 'Choisis la couleur de ton aurore',
      hint: 'Elle colore les aurores boréales de ton ciel.',
      options: {
        purple: { name: 'Aurore magique', emoji: '🔮', swatch: 'linear-gradient(135deg, #7C3AED, #C026D3)' },
        blue: { name: 'Aurore glacier', emoji: '🧊', swatch: 'linear-gradient(135deg, #0284C7, #4F46E5)' },
        green: { name: 'Aurore des sapins', emoji: '🌲', swatch: 'linear-gradient(135deg, #047857, #0D9488)' },
        orange: { name: 'Aurore de feu', emoji: '🔥', swatch: 'linear-gradient(135deg, #C2410C, #BE185D)' },
        yellow: { name: 'Aurore dorée', emoji: '🌟', swatch: 'linear-gradient(135deg, #B45309, #CA8A04)' },
        rainbow: { name: 'Toutes les aurores', emoji: '🌈', swatch: 'linear-gradient(135deg, #047857, #4F46E5, #BE185D)' }
      }
    },
    preview: {
      background: 'radial-gradient(120% 60% at 30% 0%, rgba(61, 245, 176, 0.45), transparent 60%), radial-gradient(90% 50% at 85% 10%, rgba(177, 140, 255, 0.4), transparent 60%), linear-gradient(180deg, #050816, #0B1430 60%, #0C2034)',
      surface: 'rgba(190, 220, 255, 0.1)',
      border: 'rgba(110, 233, 194, 0.4)',
      accent: 'linear-gradient(90deg, #0F7F6E, #6A3FE0)',
      text: '#FFFFFF',
      radius: '0.875rem',
      font: '\'Inter\', system-ui, sans-serif',
      titleFont: '\'Bricolage Grotesque Variable\', \'Bricolage Grotesque\', system-ui, sans-serif',
      titleWeight: 800
    }
  },
  {
    id: 'mclaren',
    name: 'McLaren · Lando Norris',
    emoji: '🧡',
    tagline: 'Papaya power !',
    description: 'Orange papaya, jaune fluo de Lando, feux de départ et petite voiture qui fait des tours de circuit.',
    themeColor: '#111215',
    tones: null,
    preview: {
      background: 'linear-gradient(160deg, transparent 62%, #FF8000 62% 70%, #D7FF3A 70% 73%, transparent 73%), radial-gradient(70% 60% at 0% 100%, rgba(255, 128, 0, 0.35), transparent 70%), #121316',
      surface: 'rgba(255, 255, 255, 0.07)',
      border: 'rgba(255, 128, 0, 0.7)',
      accent: 'linear-gradient(90deg, #FF8000, #D7FF3A)',
      text: '#FFFFFF',
      radius: '0.5rem',
      font: '\'Inter\', system-ui, sans-serif',
      titleFont: '\'Barlow Condensed\', \'Arial Narrow\', sans-serif',
      titleWeight: 800,
      titleStyle: 'italic',
      titleTransform: 'uppercase'
    }
  },
  {
    // Ambiance inspirée de l'expérience web « The Symphony of Vines » (Unseen Studio)
    id: 'vines',
    name: 'Symphonie des vignes',
    emoji: '🍇',
    tagline: 'Un film d\'époque au château',
    description: 'Noir sépia, lumière dorée qui filtre, poussière qui danse, grain de pellicule et grandes lettres classiques.',
    themeColor: '#0A0901',
    tones: null,
    preview: {
      background: 'repeating-conic-gradient(from 100deg at 0 0, rgba(255, 228, 190, 0) 0deg 4deg, rgba(255, 228, 190, 0.12) 6deg, rgba(255, 228, 190, 0) 8deg 11deg), radial-gradient(90% 70% at 15% 0%, rgba(214, 170, 120, 0.45), transparent 65%), linear-gradient(180deg, #2A2318, #0A0901)',
      surface: 'rgba(225, 217, 209, 0.06)',
      border: 'rgba(156, 110, 73, 0.7)',
      accent: 'linear-gradient(90deg, #8F6340, #7E3A36)',
      text: '#F3F1ED',
      radius: '0.375rem',
      font: '\'Inter\', system-ui, sans-serif',
      titleFont: '\'Bellefair\', Georgia, serif',
      titleWeight: 400
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
