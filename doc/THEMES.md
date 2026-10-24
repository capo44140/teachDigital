# Thèmes de l'application

TeachDigital propose six thèmes. **Liquid Glass**, le design d'origine, reste le thème par
défaut ; les autres sont des clins d'œil à des séries et à la Formule 1, sans logo ni image
officiels (décors dessinés en SVG ou en CSS, polices libres OFL / Apache).

| Thème | `data-app-theme` | Ambiance | Polices | Couleur préférée de l'enfant |
| --- | --- | --- | --- | --- |
| 💎 Liquid Glass | `liquid-glass` | Verre dépoli, dégradés violets, fond animé | Système | Teinte du fond animé |
| 🍿 Netflix | `netflix` | Noir #141414, rouge #E50914, coins vifs, en-têtes en dégradé noir, tuiles qui zooment au survol, « Qui est-ce ? » façon écran de profils | Bebas Neue (titres) | Ignorée |
| 🐶 Pat' Patrouille | `paw-patrol` | Ciel bleu du badge, pattes et os, titres blancs cernés de bleu marine, logo en écusson, cartes « autocollants », boutons en relief | Luckiest Guy (titres), Fredoka (texte) | Chiot préféré : Everest, Chase, Rocky, Zuma, Ruben ou toute l'équipe (couleur des grandes pattes) |
| 🍎 Desperate Housewives | `desperate-housewives` | Nuit violine sur Wisteria Lane : glycines, lune, palissade blanche, pétales qui tombent, pomme rouge, liserés dorés, logo en pomme | Playfair Display (titres) | Ignorée |
| 🏀 Les Frères Scott | `one-tree-hill` | Coucher de soleil sur le River Court : ciel étoilé, soleil derrière l'arbre seul sur la colline, panier en silhouette, orange du ballon, logo en ballon de basket | Permanent Marker (titres, façon graffiti) | Ignorée |
| 🏎️ Formule 1 | `formula-1` | Fibre de carbone, rouge #E10600, damier, vibreur rouge et blanc, lignes de vitesse, titres en italique majuscule, cartes au liseré rouge façon chronométrage, logo en plaque inclinée | Titillium Web (titres et texte) | Écurie : Secteur violet, Red Bull, Aston Martin, McLaren, Renault ou toute la grille (couleur des lignes de vitesse) |

## 👪 Qui choisit quoi

- **Thème de la famille** : Paramètres parent → *Apparence* → **Thèmes de l'application**
  (`/theme-settings`). Il habille le code familial, le choix du profil et l'espace parent, et
  c'est le thème des enfants qui n'en ont pas d'autre.
- **Thème d'un enfant** : attribué par le parent sur la même page, ou choisi par l'enfant dans
  *Mes paramètres* si l'interrupteur « Laisser les enfants changer leur thème » est activé
  (c'est le cas par défaut). Interdire le choix ne retire pas les thèmes déjà attribués.
- Le choix s'applique tout de suite, avec un fondu enchaîné (View Transitions API) sauf si les
  animations sont réduites. « Tout réinitialiser » remet Liquid Glass partout.
- Comme les préférences d'affichage, les thèmes sont enregistrés **sur l'appareil**
  (`localStorage`, clé `teachdigital_theme`) et synchronisés entre les onglets ; rien n'est
  envoyé au serveur.

## ⚙️ Fonctionnement

| Élément | Fichier |
| --- | --- |
| Registre des thèmes (nom, description, couleur de la barre d'état, couleurs préférées, miniature) | `src/themes/index.js` |
| État, résolution du thème actif, application à `<html>` | `src/stores/themeStore.js` |
| Sélecteur en cartes avec miniatures (boutons radio natifs) | `src/components/ThemePicker.vue` |
| Page parent | `src/views/ThemeSettings.vue` (route `/theme-settings`) |
| Choix de l'enfant | `src/views/ChildSettings.vue` |
| Styles des thèmes | `src/styles/themes/<id>.css`, importés par `src/style.css` avant `preferences.css` |
| Décors | `src/assets/themes/*.svg` |
| Thème posé avant le premier rendu | `public/theme-boot.js` |

- `App.vue` appelle `themeStore.setActiveProfile()` selon la route, comme pour les préférences
  d'affichage : dans l'espace d'un enfant, son thème ; ailleurs, celui de la famille. Le store
  pose `data-app-theme` sur `<html>` et met à jour `<meta name="theme-color">`.
- **Pas de flash au démarrage** : `public/theme-boot.js`, script classique et bloquant du
  `<head>` (la CSP `script-src 'self'` interdit le script inline), relit le dernier thème
  appliqué et le pose avant le premier rendu. Il est précaché par le service worker
  (`urlsToCache` de `public/sw.js`) et servi en `no-cache` par `frontend/nginx.conf`.

### Comment un thème habille toute l'interface

Tailwind CSS 4 compile chaque classe de couleur en variable : `bg-purple-500/30`,
`from-pink-500`, `ring-purple-400` ou `text-white/70` lisent `var(--color-…)`, et `rounded-xl`
lit `var(--radius-xl)`. Un thème **redéfinit ces variables** sous
`:root[data-app-theme="<id>"]`, ce qui recolore et remodèle toutes les pages sans toucher aux
composants : le violet de marque devient le rouge Netflix, le rouge de Marcus ou la glycine ;
les gris deviennent des gris neutres, un bleu marine ou une prune, etc.

Chaque fichier de thème a deux parties :

1. **`@layer base`** : les variables (palette `--color-*`, `--radius-*`, `--lg-glass-*`,
   jetons `--td-*`) et la typographie des titres. Étant en couche, elles s'effacent toujours
   devant les préférences d'accessibilité (`preferences.css`, hors couche).
2. **Hors couche** : l'habillage d'éléments repères (fond, en-têtes, logo, cartes…), qui doit
   primer sur les utilitaires Tailwind et les styles scopés des composants. Face à lui, les
   règles de `preferences.css` concernées sont en `!important`.

### Jetons `--td-*`

Les couleurs écrites en CSS dans les composants (hors classes Tailwind) passent par ces jetons,
avec **leur valeur d'origine en repli** :
`background: var(--td-accent-gradient, linear-gradient(to right, #a855f7, #ec4899))`.
Liquid Glass ne les définit pas : il garde exactement son apparence.

| Jeton | Usage |
| --- | --- |
| `--td-font-body`, `--td-font-display` | Police du texte (`body`) et des titres |
| `--td-page-bg`, `--td-page-gradient` | Fond de secours de `<html>` |
| `--td-surface-base` | Teinte des surfaces opaques (« réduire la transparence ») |
| `--td-surface-solid`, `--td-surface-raised`, `--td-surface-overlay`, `--td-surface-option` | Boîte de confirmation et lien d'évitement, carte de bienvenue, toasts, options des listes déroulantes |
| `--td-backdrop`, `--td-backdrop-glow`, `--td-backdrop-deep` | Voiles des modales et de la présentation |
| `--td-skeleton-bg` | Squelette de chargement des profils |
| `--td-accent`, `--td-accent-hover` | Bouton principal plein |
| `--td-accent-gradient` (+ `-hover`, `-soft`, `-faint`, `-faint-hover`) | Dégradés d'action (pavé PIN, présentation, pages de cours, boutons rapides de l'enfant) |
| `--td-accent-text-gradient`, `--td-accent-glow` (+ `-strong`), `--td-accent-muted` | Titres en dégradé, halos et ombres colorés |
| `--td-focus-ring`, `--td-focus-border`, `--td-focus-halo` | Anneau de focus, champs actifs |
| `--td-radius-scale` | Multiplie les rayons écrits en CSS : `calc(1.5rem * var(--td-radius-scale, 1))` |
| `--lg-glass-blur`, `--lg-glass-elevation`, `--lg-glass-border-hover`, `--lg-glass-shadow-hover` | Cartes partagées, en plus des variables `--lg-glass-*` existantes |

### Crochets d'habillage

| Sélecteur | Élément |
| --- | --- |
| `.app-background`, ses `::before` / `::after`, `.app-background__blob--1/2/3` | Fond partagé (`AppBackground.vue`) ; `[data-tone]` porte la couleur préférée |
| `.td-page-header` | En-tête des pages |
| `.td-brand-mark`, `.td-brand-name` | Logo « TD » et nom TeachDigital |
| `.glass-card-*`, `.glass-button-*` | Cartes et boutons partagés |
| `.profile-card-glass`, `.profile-image-glass`, `.profile-name-glass` | Écran « Qui est-ce ? » |
| `button[class*="bg-gradient-to-"]` | Boutons d'action en dégradé |

## ➕ Ajouter un thème

1. Ajouter une entrée à `APP_THEMES` (`src/themes/index.js`) : `id` en minuscules et tirets,
   `themeColor`, `tones` (`null` si le thème ignore la couleur préférée) et `preview`.
2. Créer `src/styles/themes/<id>.css` en partant d'un thème existant, et l'importer dans
   `src/style.css` **avant** `preferences.css`.
3. Polices : ajouter le paquet `@fontsource/…` et déclarer un `@font-face` qui ne charge que le
   woff2 latin (`url('@fontsource/<police>/files/<police>-latin-400-normal.woff2')`).
4. Décors : fichiers dans `src/assets/themes/`, référencés depuis la racine
   (`url('/src/assets/themes/<fichier>.svg')`). Avec le plugin PostCSS de Tailwind, une URL
   relative d'un fichier importé n'est pas réécrite.
5. Vérifier :
   - les contrastes : texte blanc ≥ 4,5:1 sur les nuances 500 / 600 des boutons, texte
     secondaire (`text-white/70`) lisible sur le fond ;
   - le rendu en contraste élevé, en lecture facile, avec les animations réduites et sur petit
     écran ;
   - les tests : `tests/stores/themeStore.test.js` contrôle que chaque thème du registre est
     complet.

## ♿ Accessibilité

- **Contraste élevé** : fond noir uni, sans décor, et surfaces opaques, quel que soit le thème.
- **Lecture facile** : police lisible, y compris dans les titres (les polices décoratives des
  thèmes sont retirées).
- **Animations réduites** (préférence de l'enfant ou du système) : décors immobiles, pas de
  fondu au changement de thème.
- **Petit écran** : décors immobiles et sans flou ; les pattes de la Pat' Patrouille se font
  plus discrètes.
- **Réduire la transparence** : surfaces presque opaques, dans la teinte du thème.
- Le focus clavier reste visible dans chaque thème (blanc, jaune ou doré selon le fond).

## 📦 Poids

Les cinq thèmes ajoutent environ 10 Ko (gzip) au CSS. Les polices (woff2, 12 à 39 Ko chacune)
ne sont téléchargées que lorsqu'un thème les affiche ; comme tous les fichiers du build, elles
sont précachées par le service worker pour le mode hors ligne.
