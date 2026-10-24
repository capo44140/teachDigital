# 🎮 Jeux (Pac-Man, Tetris)

Les enfants disposent d'une section « Jeux ». Chaque jeu est **fermé par défaut** : le parent
l'ouvre enfant par enfant, avec une condition éventuelle et une durée de jeu maximale par jour.
Le serveur vérifie la condition et compte le temps de jeu.

## 👨‍👩‍👧 Parent : règles d'accès

`/parent-game-management` (`src/views/ParentGameManagement.vue`), tuile « Jeux » du tableau de
bord parent.

1. Choisir l'enfant (seuls les profils enfant et ado actifs sont proposés).
2. Pour chaque jeu :
   - **Autoriser ce jeu** : sans cela, le jeu reste verrouillé, quelle que soit la condition ;
   - **Condition** (facultative), vérifiée à partir des quiz **terminés** (leçons et pages de
     cours ; les sauvegardes intermédiaires ne comptent pas) :

     | Condition | Objectif | Exemple |
     | --- | --- | --- |
     | Sans condition | — | Jeu ouvert dès qu'il est autorisé |
     | Quiz terminés aujourd'hui | 1 à 20 quiz | « Terminer 2 quiz aujourd'hui » |
     | Quiz terminés cette semaine | 1 à 50 quiz | Semaine du lundi au dimanche |
     | Moyenne des quiz de la semaine | 1 à 100 % | Au moins un quiz dans la semaine |
     | Jours de suite avec un quiz | 1 à 30 jours | Série en cours (aujourd'hui ou hier inclus) |

   - **Temps de jeu par jour**, pour ce jeu : sans limite, ou de 10 à 120 minutes.
3. **Enregistrer** (bouton actif seulement si la règle a changé). La carte affiche ce que voit
   l'enfant : accessible, temps restant, ou motif du verrou avec sa progression (« 1 / 2 »).

**Essayer** ouvre le jeu dans une fenêtre, sans rien enregistrer. Un parent qui ouvre la page
de jeu d'un enfant en session parent est lui aussi en **aperçu** : aucune partie, temps non compté.

Une règle modifiée s'applique tout de suite : si le jeu est refermé ou que le temps est réduit,
la partie en cours s'arrête au signal suivant (moins de 15 secondes).

## 🧒 Enfant : salle de jeux

`/games?profile=<id>` (`src/views/GameArcade.vue`), bouton « Voir mes jeux » du tableau de bord.

- Jeu ouvert : temps restant aujourd'hui, record, bouton « Jouer ».
- Jeu verrouillé : phrase expliquant pourquoi (« Pour jouer : terminer 2 quiz aujourd'hui. »),
  barre de progression vers la condition, et bouton vers les quiz.

Partie : `/games/<clé>?profile=<id>` (`src/views/GamePlayer.vue`).

- Le compte à rebours du jour est affiché en haut ; à zéro, la partie s'arrête (« Reviens
  demain ! »).
- Le temps ne compte que pendant une partie **en cours** : ni l'écran « Jouer », ni la pause, ni
  l'écran de fin. Quand l'onglet est masqué, le jeu se met en pause ; l'enfant reprend lui-même.
- Commandes : flèches ou ZQSD (WASD en QWERTY), P ou Échap pour la pause. Sur tablette : boutons
  à l'écran (maintenir pour répéter dans Tetris) et glissement du doigt dans Pac-Man.

| Jeu | Règles |
| --- | --- |
| **Pac-Man** | Labyrinthe 19 × 21, 3 vies. Pastille 10 points, super-pastille 50 points (les fantômes ont peur et fuient). Fantôme mangé : 200, 400, 800 puis 1 600 points. Niveau suivant quand toutes les pastilles sont mangées : un peu plus rapide, peur plus courte |
| **Tetris** | Grille 10 × 20, sac de 7 pièces, pièce suivante et pièce fantôme. 1 à 4 lignes : 100, 300, 500, 800 points × niveau ; descente douce 1 point par case, chute immédiate 2 points. Niveau suivant toutes les 10 lignes |

## 🔧 Technique

| Élément | Détail |
| --- | --- |
| Tables | `game_access_rules` (une règle par enfant et par jeu, `UNIQUE (profile_id, game_key)`) et `game_sessions` (parties : durée, score). Migration `backend/migrations/0103_games.sql` ; suppression en cascade avec le profil |
| Catalogue et conditions | `backend/lib/games.js` : clés des jeux, conditions et bornes, évaluation de l'accès (fermé → condition → temps). Le client reçoit le catalogue des conditions avec la liste des jeux |
| `GET /api/games?profileId=` | Profil accessible au jeton (`canAccessProfile`). Jeux, règle, accès évalué (`unlocked`, `reason`, `message`, `condition`, `remainingSeconds`), meilleur score, catalogue des conditions |
| `PUT /api/games/:gameKey/rules/:profileId` | Parent uniquement (`requireAdmin`), corps `gameRuleUpdateSchema`. Profil enfant ou ado uniquement (404 sinon) |
| `POST /api/games/:gameKey/sessions` | Début de partie (`{ profileId }`). Jeu verrouillé : **409 `GAME_LOCKED`**, avec le motif dans `message` et `access` |
| `PUT /api/games/sessions/:id` | Signal de vie `{ score, ended, idle }`. Ajoute le temps écoulé depuis le signal précédent, **au plus 45 s** (onglet en veille, page fermée sans prévenir) ; `idle` : reprise après une pause, rien n'est ajouté. Réévalue l'accès et répond `stop: true` si la partie doit s'arrêter |
| Client | `src/services/gameService.js` (signal toutes les 15 s pendant une partie, fin envoyée en `keepalive` à la fermeture), logique des jeux sans DOM dans `src/games/` (`pacman.js`, `tetris.js`), composants `src/components/games/` |
| Jour et semaine | Bornes calculées à l'heure locale du serveur (`lib/streaks.js`), comme le résumé de progression |

Ajouter un jeu : une entrée dans `GAMES` (`backend/lib/games.js`), un composant dans
`src/components/games/` et son affichage dans `src/games/catalog.js`.

## 🚨 Dépannage

| Symptôme | Piste |
| --- | --- |
| « Ce jeu n'est pas encore ouvert » | La règle de cet enfant n'a jamais été enregistrée, ou « Autoriser ce jeu » est décoché |
| Condition remplie mais jeu verrouillé | Seuls les quiz **terminés** comptent ; « aujourd'hui » et « cette semaine » suivent l'heure du serveur |
| Temps du jour épuisé trop vite | Le temps compte pendant une partie en cours, sur tous les appareils de l'enfant ; il est remis à zéro chaque jour (par jeu) |
| Partie arrêtée en plein jeu | Temps écoulé, jeu refermé par un parent, ou condition plus remplie (changement de jour) |
