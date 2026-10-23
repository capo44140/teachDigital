/**
 * Schémas Zod des entrées des routes IA
 *
 * Les bornes limitent le coût des appels aux LLM (nombre de questions, taille des textes,
 * nombre de documents) : une valeur hors bornes est refusée (400), jamais transmise au provider.
 */

const { z } = require('zod');

const MAX_QUESTION_COUNT = 40;
const DEFAULT_QUESTION_COUNT = 5;
const MAX_TEXT_LENGTH = 50000;
const MAX_DOCUMENTS = 10;
const MAX_EXTRACTED_TEXT_LENGTH = 20000;
const MAX_ANALYSIS_JSON_LENGTH = 20000;

const isMissing = value => value === undefined || value === null || value === '';

function parseJsonIfString(value) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

const QUESTION_COUNT_MESSAGE = `Le nombre de questions doit être un entier entre 1 et ${MAX_QUESTION_COUNT}`;

// Nombre de questions : 5 par défaut, entier 1..40 (chaîne acceptée : champ multipart)
const questionCountSchema = z.preprocess(
    value => (isMissing(value) ? DEFAULT_QUESTION_COUNT : value),
    z.coerce.number({ error: QUESTION_COUNT_MESSAGE })
        .int(QUESTION_COUNT_MESSAGE)
        .min(1, QUESTION_COUNT_MESSAGE)
        .max(MAX_QUESTION_COUNT, QUESTION_COUNT_MESSAGE)
);

// Profil enfant : le frontend envoie le profil complet (avatar en base64 compris) ;
// seuls le prénom, l'âge et le niveau sont conservés (utilisés dans les prompts)
const childProfileSchema = z.preprocess(
    parseJsonIfString,
    z.object({
        name: z.string().trim().max(100, 'Prénom trop long').nullish(),
        age: z.preprocess(
            value => (isMissing(value) ? undefined : value),
            z.coerce.number({ error: 'Âge invalide' }).int('Âge invalide').min(2, 'Âge invalide').max(25, 'Âge invalide').optional()
        ),
        level: z.string().trim().max(50, 'Niveau trop long').nullish()
    }, { error: issue => (issue.input === undefined || issue.input === null ? 'Profil enfant requis' : 'Profil enfant invalide') })
).transform(profile => ({
    ...(profile.name ? { name: profile.name } : {}),
    ...(profile.age !== undefined ? { age: profile.age } : {}),
    ...(profile.level ? { level: profile.level } : {})
}));

const fileCountSchema = z.preprocess(
    value => (isMissing(value) ? 0 : value),
    z.coerce.number({ error: 'Nombre de fichiers invalide' })
        .int('Nombre de fichiers invalide')
        .min(0, 'Nombre de fichiers invalide')
        .max(MAX_DOCUMENTS, `${MAX_DOCUMENTS} fichiers maximum`)
);

// POST /generate-quiz-from-image (JSON, image en base64 ou data URL)
const quizFromImageSchema = z.object({
    image: z.string({ error: 'Image et profil enfant requis' }).min(1, 'Image et profil enfant requis'),
    childProfile: childProfileSchema,
    questionCount: questionCountSchema
});

// POST /generate-quiz-from-documents et /extract-text-from-documents (repli JSON)
const jsonDocumentSchema = z.object({
    name: z.string().max(255, 'Nom de fichier trop long').nullish(),
    type: z.string().max(100, 'Type de fichier invalide').nullish(),
    base64: z.string().nullish(),
    data: z.string().nullish()
});

const jsonDocumentsSchema = z.array(jsonDocumentSchema, { error: 'Documents requis' })
    .min(1, 'Documents requis')
    .max(MAX_DOCUMENTS, `${MAX_DOCUMENTS} documents maximum`);

// Champs du multipart / corps JSON de /generate-quiz-from-documents
const quizFromDocumentsSchema = z.object({
    childProfile: childProfileSchema,
    questionCount: questionCountSchema
});

// POST /generate-quiz-from-analyses
const analysisSchema = z.record(z.string(), z.unknown())
    .refine(value => JSON.stringify(value).length <= MAX_ANALYSIS_JSON_LENGTH, 'Analyse trop volumineuse');

const optionalText = z.string().max(MAX_EXTRACTED_TEXT_LENGTH, 'Texte extrait trop long').nullish();

const extractionSchema = z.object({
    type: z.string().max(50).nullish(),
    fileName: z.string().max(255, 'Nom de fichier trop long').nullish(),
    extractedText: optionalText,
    text: optionalText,
    ocrText: optionalText,
    analysis: analysisSchema.optional()
});

const quizFromAnalysesSchema = z.object({
    extractions: z.array(extractionSchema, { error: 'Analyses requises' })
        .min(1, 'Analyses requises')
        .max(MAX_DOCUMENTS, `${MAX_DOCUMENTS} analyses maximum`),
    childProfile: childProfileSchema,
    questionCount: questionCountSchema
});

// POST /generate-quiz-from-text
const quizFromTextSchema = z.object({
    text: z.string({ error: 'Texte et profil enfant requis' })
        .trim()
        .min(1, 'Texte et profil enfant requis')
        .max(MAX_TEXT_LENGTH, `Texte trop long (${MAX_TEXT_LENGTH.toLocaleString('fr-FR')} caractères maximum)`),
    childProfile: childProfileSchema,
    options: z.object({
        questionCount: questionCountSchema,
        subject: z.string().trim().max(100, 'Matière trop longue').nullish()
    }).nullish().transform(options => options || { questionCount: DEFAULT_QUESTION_COUNT })
});

// POST /generate-course-page (champs multipart)
const coursePageFieldsSchema = z.object({
    fileCount: fileCountSchema,
    childProfile: childProfileSchema,
    subject: z.string().optional().transform(value => String(value || '').slice(0, 100)),
    topic: z.string().optional().transform(value => String(value || '').slice(0, 255)),
    instructions: z.string().optional().transform(value => String(value || '').slice(0, 2000))
});

module.exports = {
    MAX_QUESTION_COUNT,
    MAX_DOCUMENTS,
    MAX_TEXT_LENGTH,
    questionCountSchema,
    childProfileSchema,
    fileCountSchema,
    jsonDocumentsSchema,
    quizFromImageSchema,
    quizFromDocumentsSchema,
    quizFromAnalysesSchema,
    quizFromTextSchema,
    coursePageFieldsSchema
};
