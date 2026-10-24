# Guide de design « Liquid Glass »

## 🎨 Principe

Toutes les pages de l'application partagent le même style : un fond sombre animé, des cartes en
verre translucide (`backdrop-filter: blur`), des textes blancs et des dégradés d'accent par
domaine. Il n'existe **pas** de bibliothèque de composants « Glass » : `components/ui/*` a été
supprimé. Le style repose sur Tailwind CSS 4 et sur quelques classes partagées.

| Élément | Fichier |
| --- | --- |
| Imports globaux (Tailwind, styles partagés), safe areas iOS, focus visible, `prefers-reduced-motion` | `src/style.css` |
| Variables `--lg-*` et cartes partagées | `src/styles/liquid-glass.css` |
| Préférences d'affichage des enfants (taille du texte, lecture facile, contraste, animations) | `src/styles/preferences.css` + `src/stores/settingsStore.js` |
| Thèmes (Netflix, Pat' Patrouille, Desperate Housewives, Les Frères Scott, Formule 1) | `src/styles/themes/*.css` + `src/themes/index.js` + `src/stores/themeStore.js` — voir [THEMES.md](THEMES.md) |
| Fond animé commun | `src/components/AppBackground.vue` |
| Fenêtres modales | `src/components/BaseModal.vue`, `src/components/ConfirmDialog.vue` |

## 🎭 Thèmes

Liquid Glass est le **thème par défaut**. Les autres thèmes redéfinissent les variables de
l'interface sous `:root[data-app-theme="<id>"]` : la palette Tailwind (`--color-*`), les rayons
(`--radius-*`), les variables `--lg-*` et des jetons `--td-*`. Pour qu'un nouvel écran suive
les thèmes :

- utiliser les classes Tailwind de la palette (elles suivent le thème) plutôt que des couleurs
  écrites en dur ;
- dans un `<style>`, lire un jeton avec la couleur d'origine en repli
  (`var(--td-accent-gradient, linear-gradient(…))`) et écrire les rayons
  `calc(1rem * var(--td-radius-scale, 1))` ;
- un en-tête de page porte la classe `td-page-header`.

Détails, liste des jetons et ajout d'un thème : [THEMES.md](THEMES.md).

## 🌌 Fond partagé (`AppBackground`)

`App.vue` le rend **une seule fois**, derrière toutes les pages (`z-index: -1`). Une page ne doit
donc pas dessiner son propre fond. Il se compose d'un dégradé slate-900 → purple-900 et de trois
disques flous animés.

- Teinte : `meta.bgTone` de la route (`blue`, `green`, `red`, `orange`, `yellow`, `rainbow` ;
  violet par défaut). La couleur choisie par l'enfant dans « Mes paramètres » est prioritaire.
  Seuls les thèmes qui en tiennent compte la reçoivent (Liquid Glass, Pat' Patrouille, Formule 1).
- Chaque thème redessine ce fond (pattes, glycines, halo rouge…) par ses classes
  `.app-background` et `.app-background__blob--1/2/3`.
- Sur petit écran, avec « réduire les animations » ou « réduire la transparence », les disques
  deviennent des dégradés statiques, sans filtre ni animation.

## 🧊 Classes et variables partagées (`liquid-glass.css`)

```css
--lg-glass-light: rgba(255, 255, 255, 0.08);   /* fond des cartes */
--lg-glass-heavy: rgba(255, 255, 255, 0.12);   /* survol */
--lg-glass-border: rgba(255, 255, 255, 0.15);
--lg-primary-purple: #8B5CF6;  /* + --lg-pink, --lg-blue, --lg-cyan, --lg-emerald, --lg-orange… */
--lg-transition-normal: all 0.3s ease;
```

| Classe | Usage |
| --- | --- |
| `.glass-card-dashboard` | Carte de section (tableaux de bord, paramètres) : colonne flex, padding 1.5rem, rayon 1.5rem, flou 20px |
| `.glass-card-stat` | Statistique en ligne (icône + valeur), qui se soulève au survol |
| `.glass-stat-card` | Bloc de statistique dont la mise en page revient au composant |

Le reste s'écrit en utilitaires Tailwind, sur ce modèle :

```html
<section class="glass-card-dashboard" aria-labelledby="titre-section">
  <h2 id="titre-section" class="text-xl font-bold text-white">Titre</h2>
  <p class="text-white/70">Texte secondaire</p>
  <button class="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white
                 focus:outline-none focus:ring-2 focus:ring-purple-400">
    Action
  </button>
</section>
```

Repères : textes `text-white` et `text-white/70` ; champs `bg-white/10 border border-white/20` ;
dégradés d'accent par domaine (profils : bleu → cyan, apprentissage : vert → émeraude, quiz :
violet → rose, activités : orange → rouge). Les icônes sont des SVG inline (`aria-hidden="true"`)
ou des emoji. Il n'y a pas de bibliothèque d'icônes.

## ♿ Accessibilité (obligatoire)

- **Préférences enfant** (`settingsStore`, classes posées sur `<html>`) : `td-font-small` et
  `td-font-large` pour la taille du texte (toute l'interface est en `rem`), `td-easy-read` pour la
  lecture facile, `td-high-contrast` pour le contraste élevé (fonds pleins, sans flou),
  `td-reduce-motion` pour supprimer les animations. Ces préférences ne s'appliquent que dans
  l'espace enfant. Conséquences pour le code :
  - utiliser des tailles en `rem` (classes Tailwind), pas en `px` ;
  - en contraste élevé, les classes contenant `bg-white/`, `text-white/`, `glass-card`,
    `glass-stat`… sont surchargées. Un nouveau motif translucide doit reprendre ces préfixes, ou
    être ajouté à `preferences.css`.
  - ces préférences priment sur les thèmes (fond uni sans décor en contraste élevé, police
    lisible dans les titres en lecture facile).
- `prefers-reduced-motion` est respecté globalement (`style.css`).
- Un anneau de focus visible est défini par défaut (`:focus-visible`) ; ne pas le supprimer sans
  le remplacer.
- **Modales** : toujours passer par `BaseModal`, qui gère `role="dialog"`, `aria-modal`, le titre
  associé, le focus piégé, la touche Échap et le retour du focus. Pour une confirmation, utiliser
  `useConfirm()` / `this.$confirm(...)` (affiché par `ConfirmDialog`), jamais `window.confirm`.
  Les classes passées à `overlayClass` / `panelClass` doivent être globales (Tailwind), car
  la modale est téléportée hors du composant.
- Contraste : le texte secondaire ne descend pas sous `text-white/70` sur fond de verre.

## ⚡ Performance

`backdrop-filter` coûte cher sur mobile. Il faut éviter d'empiler des couches floues et de
recréer des fonds animés dans les pages : le fond est déjà fourni par `AppBackground`.
