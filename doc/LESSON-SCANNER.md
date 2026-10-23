# Scanner de leçons avec IA

## Fonctionnalité

Le scanner (`/lesson-scanner`, `src/views/LessonScanner.vue`, réservé aux parents) transforme des
photos de leçon en quiz :

1. choix de l'enfant (ses niveau et âge orientent la génération) ;
2. envoi de 1 à 10 photos de la leçon ;
3. extraction du texte de chaque image, puis génération d'un quiz à partir de ces extractions ;
4. enregistrement de la leçon (`POST /api/lessons`), puis ouverture du quiz en aperçu parent.

L'enfant retrouve ensuite le quiz sur son tableau de bord. Ses réponses sont notées par le serveur
(voir plus bas).

Pour générer un quiz à partir d'un texte collé : `/text-quiz-generator`
(`src/views/TextQuizGenerator.vue`). Le parcours commun « générer → enregistrer → ouvrir l'aperçu »
est dans `src/composables/useQuizGeneration.js`.

## Formats acceptés

- **Images uniquement** : JPG, PNG ou WebP, 10 au maximum par leçon.
- Les PDF et les autres types de fichiers sont refusés par le serveur (415
  `UNSUPPORTED_FILE_TYPE`). L'écran les écarte avant l'envoi.
- Taille : 15 Mo par fichier et 25 Mo par envoi (`API_UPLOAD_MAX_*`). Les images sont compressées
  côté navigateur avant l'envoi.

## Routes IA utilisées (`backend/api/ai/index.js`, parent uniquement)

| Route | Rôle |
| --- | --- |
| `POST /api/ai/extract-text-from-documents` | Texte d'une image, par un LLM vision ou Tesseract selon `OCR_MODE` |
| `POST /api/ai/generate-quiz-from-analyses` | Quiz à partir des textes extraits |
| `POST /api/ai/generate-quiz-from-text` | Quiz à partir d'un texte (générateur texte) |
| `POST /api/ai/generate-quiz-from-image`, `generate-quiz-from-documents` | Variantes en un seul appel |

Chaque génération a un délai global (`AI_REQUEST_TIMEOUT_MS`, 170 s). Elle est annulée si le
navigateur abandonne la requête.

## Configuration IA

- Les clés des fournisseurs se saisissent dans **Configuration IA** (`/ai-settings`), où elles sont
  enregistrées chiffrées (`AI_SETTINGS_KEY`), ou dans le `.env` du backend. Elles ne doivent
  **jamais** figurer dans une variable `VITE_*`, qui serait publiée dans le JavaScript du
  navigateur.
- Ordre d'essai des fournisseurs disponibles : LLM local (LM Studio / Ollama) → OpenAI → Gemini →
  DeepSeek → Groq → Mistral → Kimi → OpenRouter. Variables de réglage : `AI_PROVIDER`,
  `AI_PROVIDERS_ORDER` et `AI_DISABLE_PROVIDERS`.
- Il n'y a **pas de mode démo** : sans fournisseur disponible, la génération échoue avec un
  message explicite.
- OCR : `OCR_MODE=llm` (vision, meilleure qualité) ou `tesseract` (hors ligne). Avec Tesseract, les
  données de langue sont téléchargées au premier usage puis gardées dans le volume
  `.cache/tesseract`.

## Passage du quiz (`/quiz-generator?childId=&lessonId=`)

- L'enfant ne reçoit jamais les bonnes réponses ni les explications avant de valider :
  `GET /api/lessons/:id` les retire pour un non-parent.
- À la fin, seules les réponses sont envoyées (`POST /api/lessons/:id/quiz-results`,
  `{ profileId, answers }`). Le serveur calcule le score et renvoie la correction
  (`correction`) ainsi que les badges débloqués.
- En session parent, le quiz s'ouvre en aperçu : rien n'est enregistré.
