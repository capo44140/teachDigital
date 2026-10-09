/**
 * Router principal pour l'API IA
 * Gère les routes pour la génération de quiz basée sur l'IA
 */


const { runCors } = require('../../lib/cors.js');
const { createResponse, createErrorResponse } = require('../../lib/response.js');

// Services
const { analyzeImage } = require('./services/imageAnalysis.js');
const { extractTextFromImage } = require('./services/ocr.js');
const { extractTextFromImageWithLLM } = require('./services/ocrLLM.js');
const { analyzeWithAI } = require('./services/aiProviders/index.js');
const { generateQuizFromAnalysis, generateQuizFromMultipleAnalyses, generateQuizFromTextWithAI } = require('./services/quizGenerator.js');
const { parseFormData, bufferToBase64 } = require('./middleware/formDataParser.js');
const { validateApiKey, hasAtLeastOneValidKey } = require('./utils/validation.js');
const { validateAndNormalizeQuiz } = require('./utils/quizFormat.js');
const localLLMConfig = require('./services/aiProviders/localLLMConfig.js');

// ==================== CONFIGURATION OCR ====================

/**
 * Détermine le mode OCR à utiliser.
 * Variable d'env OCR_MODE : "llm" (défaut) ou "tesseract"
 * Si OCR_MODE=llm, utilise LLM Vision (GPT-4o, Gemini, LocalLLM)
 * Si OCR_MODE=tesseract, utilise Tesseract.js
 */
function getDefaultOCRMode() {
    const mode = (process.env.OCR_MODE || 'llm').toLowerCase().trim();
    return mode !== 'tesseract';
}

// ==================== HANDLER PRINCIPAL ====================

/**
 * Gestionnaire pour les fonctionnalités IA
 */
module.exports = async function handler(req, res) {
    console.log(`🚀 AI handler: ${req.method} ${req.url}`);

    // Gestion CORS
    await runCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let url;
    try {
        // Authentification parent (requireAdmin) appliquée par le routeur (api/index.js)

        const { method } = req;
        url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        // Routes IA
        if (pathname === '/generate-quiz-from-image' && method === 'POST') {
            return await handleGenerateQuizFromImage(req, res);
        }

        if (pathname === '/generate-quiz-from-documents' && method === 'POST') {
            return await handleGenerateQuizFromDocuments(req, res);
        }

        if (pathname === '/extract-text-from-documents' && method === 'POST') {
            return await handleExtractTextFromDocuments(req, res);
        }

        if (pathname === '/generate-quiz-from-analyses' && method === 'POST') {
            return await handleGenerateQuizFromAnalyses(req, res);
        }

        if (pathname === '/generate-quiz-from-text' && method === 'POST') {
            return await handleGenerateQuizFromText(req, res);
        }

        if (pathname === '/validate-key' && method === 'GET') {
            return await handleValidateKey(req, res);
        }

        if (pathname === '/has-valid-key' && method === 'GET') {
            return await handleHasValidKey(req, res);
        }

        // Routes LM Studio / LocalLLM
        if (pathname === '/local-llm/models' && method === 'GET') {
            return await handleGetLocalLLMModels(req, res);
        }

        if (pathname === '/local-llm/status' && method === 'GET') {
            return await handleGetLocalLLMStatus(req, res);
        }

        if (pathname === '/local-llm/model' && method === 'POST') {
            return await handleSetLocalLLMModel(req, res);
        }

        if (pathname === '/providers' && method === 'GET') {
            return await handleGetProviders(req, res);
        }

        // Route non trouvée
        return res.status(404).json(createErrorResponse('Endpoint non trouvé'));

    } catch (error) {
        console.error('❌ Erreur dans le gestionnaire IA:', {
            message: error.message,
            stack: error.stack?.substring(0, 500),
            name: error.name,
            pathname: url?.pathname,
            method: req.method
        });
        return res.status(500).json(createErrorResponse('Erreur serveur interne'));
    }
};

// ==================== HANDLERS DE ROUTES ====================

/**
 * Génère un quiz à partir d'une image
 */
async function handleGenerateQuizFromImage(req, res) {
    console.log('📸 handleGenerateQuizFromImage: Début');
    try {
        let imageBase64, childProfile;
        let questionCount = 5;

        // Gérer JSON avec base64 (le frontend convertit maintenant en base64)
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // Extraire base64 de l'image (peut être data:image/jpeg;base64,... ou juste base64)
        if (body.image) {
            imageBase64 = body.image.includes('base64,')
                ? body.image.split('base64,')[1]
                : body.image;
        }

        childProfile = typeof body.childProfile === 'string'
            ? JSON.parse(body.childProfile)
            : body.childProfile;

        questionCount = body.questionCount || 5;

        if (!imageBase64 || !childProfile) {
            return res.status(400).json(createErrorResponse('Image et profil enfant requis'));
        }

        // Analyser l'image puis générer le quiz
        const analysis = await analyzeImage(imageBase64);
        const quiz = await generateQuizFromAnalysis(analysis, childProfile, questionCount);
        const validated = validateAndNormalizeQuiz(quiz, { expectedQuestionCount: Number(questionCount) });
        if (!validated.ok) {
            return res.status(422).json(createErrorResponse(
                'Quiz généré invalide (format attendu: title, questions[question, options(4), correctAnswer(0..3)]).',
                'INVALID_QUIZ_FORMAT',
                { errors: validated.errors, warnings: validated.warnings }
            ));
        }

        return res.status(200).json(createResponse('Quiz généré avec succès', { quiz: validated.quiz, warnings: validated.warnings }));
    } catch (error) {
        console.error('Erreur lors de la génération du quiz depuis image:', error);
        if (error.code === 'AI_UNAVAILABLE') {
            return res.status(503).json(createErrorResponse(
                'Impossible de générer le quiz : aucun service d\'intelligence artificielle disponible. Vérifiez la configuration des clés API.'
            ));
        }
        return res.status(500).json(createErrorResponse('Erreur lors de la génération du quiz: ' + error.message));
    }
}

/**
 * Génère un quiz à partir de plusieurs documents
 * Supporte maintenant FormData pour éviter les erreurs 413
 */
async function handleGenerateQuizFromDocuments(req, res) {
    console.log('📚 handleGenerateQuizFromDocuments: Début');
    try {
        console.log('🔍 Début de handleGenerateQuizFromDocuments');
        console.log('📋 Content-Type:', req.headers['content-type']);

        const contentType = req.headers['content-type'] || '';
        const isFormData = contentType.includes('multipart/form-data');

        let documents = [];
        let childProfile;
        let questionCount = 5;
        let useLLMOCR = getDefaultOCRMode();

        if (isFormData) {
            // Parser FormData
            console.log('📦 Parsing FormData...');
            const parsed = await parseFormData(req);

            console.log('📊 Données parsées par parseFormData:', {
                hasFields: !!parsed.fields,
                hasFiles: !!parsed.files,
                fieldsKeys: parsed.fields ? Object.keys(parsed.fields) : [],
                filesCount: parsed.files ? parsed.files.length : 0
            });

            console.log(`🔍 Mode OCR (via env OCR_MODE): ${useLLMOCR ? 'LLM Vision' : 'Tesseract'}`);

            // Extraire les fichiers et métadonnées
            if (parsed.files && parsed.fields) {
                // Format avec busboy
                const fileCount = parseInt(parsed.fields.fileCount || '0');
                console.log(`📁 Nombre de fichiers attendus: ${fileCount}`);
                console.log(`📁 Fichiers disponibles:`, parsed.files.map(f => ({ fieldname: f.fieldname, filename: f.filename })));

                for (let i = 0; i < fileCount; i++) {
                    const file = parsed.files.find(f => f.fieldname === `file_${i}`);
                    if (file) {
                        const fileName = parsed.fields[`file_${i}_name`] || file.filename;
                        const fileType = parsed.fields[`file_${i}_type`] || file.mimetype;

                        console.log(`✅ Fichier ${i} trouvé:`, { fileName, fileType, size: file.buffer?.length || 0 });

                        documents.push({
                            name: fileName,
                            type: fileType,
                            buffer: file.buffer,
                            base64: bufferToBase64(file.buffer)
                        });
                    } else {
                        console.warn(`⚠️ Fichier ${i} non trouvé dans parsed.files`);
                    }
                }

                childProfile = JSON.parse(parsed.fields.childProfile || '{}');
                questionCount = parseInt(parsed.fields.questionCount || '5');
            } else if (parsed.file_0) {
                // Format déjà parsé par Vercel
                const fileCount = parseInt(parsed.fileCount || '0');
                for (let i = 0; i < fileCount; i++) {
                    const file = parsed[`file_${i}`];
                    const fileName = parsed[`file_${i}_name`] || 'unknown';
                    const fileType = parsed[`file_${i}_type`] || 'application/octet-stream';

                    // Convertir le fichier en base64 si c'est un buffer
                    let base64Data;
                    if (Buffer.isBuffer(file)) {
                        base64Data = bufferToBase64(file);
                    } else if (typeof file === 'string') {
                        base64Data = file;
                    } else {
                        console.warn(`⚠️ Format de fichier non reconnu pour file_${i}`);
                        continue;
                    }

                    documents.push({
                        name: fileName,
                        type: fileType,
                        base64: base64Data
                    });
                }

                childProfile = typeof parsed.childProfile === 'string'
                    ? JSON.parse(parsed.childProfile)
                    : parsed.childProfile;
                questionCount = parseInt(parsed.questionCount || '5');
            }
        } else {
            // Format JSON classique (rétrocompatibilité)
            console.log('📦 Parsing JSON...');
            let body;
            try {
                if (typeof req.body === 'string') {
                    body = JSON.parse(req.body);
                } else if (Buffer.isBuffer(req.body)) {
                    body = JSON.parse(req.body.toString());
                } else {
                    body = req.body;
                }
            } catch (parseError) {
                console.error('❌ Erreur de parsing du body:', parseError);
                return res.status(400).json(createErrorResponse('Format de données invalide'));
            }

            const { documents: bodyDocuments, childProfile: bodyChildProfile, questionCount: bodyQuestionCount } = body;
            documents = bodyDocuments || [];
            childProfile = bodyChildProfile;
            questionCount = bodyQuestionCount || 5;
            console.log(`🔍 Mode OCR (via env OCR_MODE): ${useLLMOCR ? 'LLM Vision' : 'Tesseract'}`);
        }

        console.log('📊 Données parsées:', {
            documentsCount: documents.length,
            hasChildProfile: !!childProfile,
            questionCount: questionCount,
            isFormData: isFormData
        });

        if (!documents || documents.length === 0) {
            return res.status(400).json(createErrorResponse('Documents requis'));
        }

        if (!childProfile) {
            return res.status(400).json(createErrorResponse('Profil enfant requis'));
        }

        console.log(`📝 Extraction OCR + Analyse de ${documents.length} document(s)...`);

        // Extraire le texte (Tesseract par défaut) puis analyser le texte pour générer le quiz
        const analyses = [];
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            console.log(`📄 Traitement du document ${i + 1}/${documents.length}: ${doc.name || 'sans nom'} (type: ${doc.type})`);

            try {
                if (doc.type?.startsWith('image/') || doc.type === 'image') {
                    const imageData = doc.base64 || doc.data;
                    if (!imageData) {
                        console.warn(`⚠️ Document ${i + 1} de type image mais sans données`);
                        continue;
                    }

                    console.log(`🖼️ Extraction OCR de l'image ${i + 1}... (${useLLMOCR ? 'LLM Vision' : 'Tesseract'})`);

                    let extractedText;
                    if (useLLMOCR) {
                        // Nettoyer le base64 si nécessaire pour l'API Vision
                        let cleanBase64 = imageData;
                        if (typeof imageData === 'string' && imageData.includes(',')) {
                            cleanBase64 = imageData.split(',')[1];
                        }
                        extractedText = await extractTextFromImageWithLLM(cleanBase64);
                    } else {
                        extractedText = await extractTextFromImage(imageData);
                    }

                    console.log(`🤖 Analyse IA du texte extrait ${i + 1}...`);
                    const analysis = await analyzeWithAI(extractedText);

                    analyses.push({ type: 'image', fileName: doc.name, extractedText, analysis });
                    console.log(`✅ Image ${i + 1} traitée avec succès (OCR + Analyse)`);
                } else if (doc.type === 'application/pdf' || doc.type === 'pdf') {
                    // Pour PDF, simuler une analyse (dans une vraie implémentation, utiliser OCR)
                    console.log(`📑 Traitement du PDF ${i + 1}...`);
                    analyses.push({
                        type: 'pdf',
                        fileName: doc.name,
                        extractedText: 'Contenu PDF extrait',
                        analysis: { subject: 'Document PDF', topic: 'Contenu extrait', concepts: [], level: 'Primaire' }
                    });
                    console.log(`✅ PDF ${i + 1} traité`);
                } else {
                    console.warn(`⚠️ Type de document non supporté: ${doc.type}`);
                }
            } catch (docError) {
                console.error(`❌ Erreur lors du traitement du document ${i + 1}:`, docError);
                // Continuer avec les autres documents
                continue;
            }
        }

        if (analyses.length === 0) {
            return res.status(400).json(createErrorResponse('Aucun document valide à analyser'));
        }

        console.log(`✅ ${analyses.length} analyse(s) complétée(s), génération du quiz...`);

        // Générer le quiz basé sur toutes les analyses
        const quiz = await generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount);
        const validated = validateAndNormalizeQuiz(quiz, { expectedQuestionCount: Number(questionCount) });
        if (!validated.ok) {
            return res.status(422).json(createErrorResponse(
                'Quiz généré invalide (format attendu: title, questions[question, options(4), correctAnswer(0..3)]).',
                'INVALID_QUIZ_FORMAT',
                { errors: validated.errors, warnings: validated.warnings }
            ));
        }

        console.log('✅ Quiz généré avec succès');
        return res.status(200).json(createResponse('Quiz généré avec succès', { quiz: validated.quiz, warnings: validated.warnings }));
    } catch (error) {
        console.error('❌ Erreur lors de la génération du quiz depuis documents:', {
            message: error.message,
            stack: error.stack?.substring(0, 500),
            name: error.name
        });

        // Si tous les services IA ont échoué, retourner un message d'erreur clair
        if (error.message.includes('Tous les services IA ont échoué')) {
            return res.status(503).json(createErrorResponse(
                'Impossible de générer le quiz. Tous les services d\'intelligence artificielle (OpenAI, Gemini, DeepSeek, Groq, Mistral) ont échoué. Veuillez réessayer plus tard ou vérifier la configuration des clés API.'
            ));
        }

        return res.status(500).json(createErrorResponse('Erreur lors de la génération du quiz: ' + error.message));
    }
}

/**
 * Extrait le texte des documents (OCR uniquement - étape 1)
 * Retourne les textes extraits et les analyses pour utilisation ultérieure
 */
async function handleExtractTextFromDocuments(req, res) {
    console.log('📚 handleExtractTextFromDocuments: Début (OCR uniquement)');
    try {
        console.log('🔍 Début de handleExtractTextFromDocuments');
        console.log('📋 Content-Type:', req.headers['content-type']);

        const contentType = req.headers['content-type'] || '';
        const isFormData = contentType.includes('multipart/form-data');

        let documents = [];
        let useLLMOCR = getDefaultOCRMode();

        if (isFormData) {
            // Parser FormData
            console.log('📦 Parsing FormData...');
            const parsed = await parseFormData(req);

            console.log('📊 Données parsées par parseFormData:', {
                hasFields: !!parsed.fields,
                hasFiles: !!parsed.files,
                fieldsKeys: parsed.fields ? Object.keys(parsed.fields) : [],
                filesCount: parsed.files ? parsed.files.length : 0
            });

            console.log(`🔍 Mode OCR (via env OCR_MODE): ${useLLMOCR ? 'LLM Vision' : 'Tesseract'}`);

            // Extraire les fichiers
            if (parsed.files && parsed.fields) {
                const fileCount = parseInt(parsed.fields.fileCount || '0');
                console.log(`📁 Nombre de fichiers attendus: ${fileCount}`);

                for (let i = 0; i < fileCount; i++) {
                    const file = parsed.files.find(f => f.fieldname === `file_${i}`);
                    if (file) {
                        const fileName = parsed.fields[`file_${i}_name`] || file.filename;
                        const fileType = parsed.fields[`file_${i}_type`] || file.mimetype;

                        documents.push({
                            name: fileName,
                            type: fileType,
                            buffer: file.buffer,
                            base64: bufferToBase64(file.buffer)
                        });
                    }
                }
            } else if (parsed.file_0) {
                const fileCount = parseInt(parsed.fileCount || '0');
                for (let i = 0; i < fileCount; i++) {
                    const file = parsed[`file_${i}`];
                    const fileName = parsed[`file_${i}_name`] || 'unknown';
                    const fileType = parsed[`file_${i}_type`] || 'application/octet-stream';

                    let base64Data;
                    if (Buffer.isBuffer(file)) {
                        base64Data = bufferToBase64(file);
                    } else if (typeof file === 'string') {
                        base64Data = file;
                    } else {
                        continue;
                    }

                    documents.push({
                        name: fileName,
                        type: fileType,
                        base64: base64Data
                    });
                }
            }
        } else {
            // Format JSON classique (rétrocompatibilité)
            console.log('📦 Parsing JSON...');
            let body;
            try {
                if (typeof req.body === 'string') {
                    body = JSON.parse(req.body);
                } else if (Buffer.isBuffer(req.body)) {
                    body = JSON.parse(req.body.toString());
                } else {
                    body = req.body;
                }
            } catch (parseError) {
                console.error('❌ Erreur de parsing du body:', parseError);
                return res.status(400).json(createErrorResponse('Format de données invalide'));
            }

            documents = body.documents || [];
            console.log(`🔍 Mode OCR (via env OCR_MODE): ${useLLMOCR ? 'LLM Vision' : 'Tesseract'}`);
        }

        console.log('📊 Documents parsés:', {
            documentsCount: documents.length,
            isFormData: isFormData
        });

        if (!documents || documents.length === 0) {
            return res.status(400).json(createErrorResponse('Documents requis'));
        }

        console.log(`📝 Extraction OCR de ${documents.length} document(s)...`);

        // Extraire le texte de tous les documents (OCR uniquement)
        const extractions = [];
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            console.log(`📄 Extraction OCR du document ${i + 1}/${documents.length}: ${doc.name || 'sans nom'} (type: ${doc.type})`);

            try {
                if (doc.type?.startsWith('image/') || doc.type === 'image') {
                    const imageData = doc.base64 || doc.data;
                    if (!imageData) {
                        console.warn(`⚠️ Document ${i + 1} de type image mais sans données`);
                        continue;
                    }
                    console.log(`🖼️ Extraction OCR de l'image ${i + 1}... (${useLLMOCR ? 'LLM Vision' : 'Tesseract'})`);
                    
                    // Utiliser LLM OCR ou Tesseract selon le paramètre
                    let extractedText;
                    if (useLLMOCR) {
                        extractedText = await extractTextFromImageWithLLM(imageData);
                    } else {
                        extractedText = await extractTextFromImage(imageData);
                    }
                    
                    // Analyser le texte extrait avec l'IA pour obtenir une analyse structurée
                    console.log(`🤖 Analyse IA du texte extrait ${i + 1}...`);
                    const analysis = await analyzeWithAI(extractedText);
                    
                    extractions.push({ 
                        type: 'image', 
                        fileName: doc.name, 
                        extractedText,
                        analysis 
                    });
                    console.log(`✅ Image ${i + 1} traitée avec succès (OCR + Analyse)`);
                } else if (doc.type === 'application/pdf' || doc.type === 'pdf') {
                    // Pour PDF, simuler une extraction (dans une vraie implémentation, utiliser OCR PDF)
                    console.log(`📑 Traitement du PDF ${i + 1}...`);
                    extractions.push({
                        type: 'pdf',
                        fileName: doc.name,
                        extractedText: 'Contenu PDF extrait',
                        analysis: { subject: 'Document PDF', topic: 'Contenu extrait', concepts: [], level: 'Primaire' }
                    });
                    console.log(`✅ PDF ${i + 1} traité`);
                } else {
                    console.warn(`⚠️ Type de document non supporté: ${doc.type}`);
                }
            } catch (docError) {
                console.error(`❌ Erreur lors du traitement du document ${i + 1}:`, docError);
                // Continuer avec les autres documents
                continue;
            }
        }

        if (extractions.length === 0) {
            return res.status(400).json(createErrorResponse('Aucun document valide à traiter'));
        }

        console.log(`✅ ${extractions.length} extraction(s) complétée(s)`);

        // Retourner les extractions avec analyses (sans générer le quiz)
        return res.status(200).json(createResponse('Textes extraits avec succès', { 
            extractions,
            count: extractions.length
        }));
    } catch (error) {
        console.error('❌ Erreur lors de l\'extraction OCR:', {
            message: error.message,
            stack: error.stack?.substring(0, 500),
            name: error.name
        });

        return res.status(500).json(createErrorResponse('Erreur lors de l\'extraction OCR: ' + error.message));
    }
}

/**
 * Génère un quiz à partir d'analyses déjà effectuées (étape 2)
 * Prend les analyses retournées par handleExtractTextFromDocuments
 */
async function handleGenerateQuizFromAnalyses(req, res) {
    console.log('🎯 handleGenerateQuizFromAnalyses: Début (Génération quiz)');
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { extractions, childProfile, questionCount = 5 } = body;

        if (!extractions || !Array.isArray(extractions) || extractions.length === 0) {
            return res.status(400).json(createErrorResponse('Analyses requises'));
        }

        if (!childProfile) {
            return res.status(400).json(createErrorResponse('Profil enfant requis'));
        }

        console.log(`🎯 Génération du quiz à partir de ${extractions.length} analyse(s)...`);

        // Convertir les extractions au format attendu par generateQuizFromMultipleAnalyses
        const analyses = extractions.map(extraction => ({
            type: extraction.type,
            fileName: extraction.fileName,
            analysis: extraction.analysis,
            // Utiliser le texte OCR (source) pour enrichir la génération du quiz
            extractedText: extraction.extractedText || extraction.text || extraction.ocrText || null
        }));

        // Générer le quiz basé sur toutes les analyses
        const quiz = await generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount);
        const validated = validateAndNormalizeQuiz(quiz, { expectedQuestionCount: Number(questionCount) });
        if (!validated.ok) {
            return res.status(422).json(createErrorResponse(
                'Quiz généré invalide (format attendu: title, questions[question, options(4), correctAnswer(0..3)]).',
                'INVALID_QUIZ_FORMAT',
                { errors: validated.errors, warnings: validated.warnings }
            ));
        }

        console.log('✅ Quiz généré avec succès');
        return res.status(200).json(createResponse('Quiz généré avec succès', { quiz: validated.quiz, warnings: validated.warnings }));
    } catch (error) {
        console.error('❌ Erreur lors de la génération du quiz depuis analyses:', {
            message: error.message,
            stack: error.stack?.substring(0, 500),
            name: error.name
        });

        // Si tous les services IA ont échoué, retourner un message d'erreur clair
        if (error.message.includes('Tous les services IA ont échoué')) {
            return res.status(503).json(createErrorResponse(
                'Impossible de générer le quiz. Tous les services d\'intelligence artificielle (OpenAI, Gemini, DeepSeek, Groq, Mistral) ont échoué. Veuillez réessayer plus tard ou vérifier la configuration des clés API.'
            ));
        }

        return res.status(500).json(createErrorResponse('Erreur lors de la génération du quiz: ' + error.message));
    }
}

/**
 * Génère un quiz à partir d'un texte
 */
async function handleGenerateQuizFromText(req, res) {
    console.log('📝 handleGenerateQuizFromText: Début');
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { text, childProfile, options = {} } = body;

        if (!text || !childProfile) {
            return res.status(400).json(createErrorResponse('Texte et profil enfant requis'));
        }

        const quiz = await generateQuizFromTextWithAI(text, childProfile, options);
        const expected = Number(options?.questionCount || 5);
        const validated = validateAndNormalizeQuiz(quiz, { expectedQuestionCount: expected });
        if (!validated.ok) {
            return res.status(422).json(createErrorResponse(
                'Quiz généré invalide (format attendu: title, questions[question, options(4), correctAnswer(0..3)]).',
                'INVALID_QUIZ_FORMAT',
                { errors: validated.errors, warnings: validated.warnings }
            ));
        }

        return res.status(200).json(createResponse('Quiz généré avec succès', { quiz: validated.quiz, warnings: validated.warnings }));
    } catch (error) {
        console.error('Erreur lors de la génération du quiz depuis texte:', error);

        // Si tous les services IA ont échoué, retourner un message d'erreur clair
        if (error.message.includes('Tous les services IA ont échoué')) {
            return res.status(503).json(createErrorResponse(
                'Impossible de générer le quiz. Tous les services d\'intelligence artificielle (OpenAI, Gemini, DeepSeek, Groq, Mistral) ont échoué. Veuillez réessayer plus tard ou vérifier la configuration des clés API.'
            ));
        }

        return res.status(500).json(createErrorResponse('Erreur lors de la génération du quiz: ' + error.message));
    }
}

/**
 * Vérifie si une clé API est valide
 */
async function handleValidateKey(req, res) {
    console.log('🔑 handleValidateKey: Début');
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const apiType = url.searchParams.get('type') || 'openai';

        const isValid = await validateApiKey(apiType);

        return res.status(200).json(createResponse('Validation effectuée', { isValid }));
    } catch (error) {
        console.error('Erreur lors de la validation de la clé API:', error);
        return res.status(500).json(createErrorResponse('Erreur lors de la validation'));
    }
}

/**
 * Vérifie si au moins une clé API est valide
 */
async function handleHasValidKey(req, res) {
    console.log('✅ handleHasValidKey: Début');
    try {
        const hasValidKey = await hasAtLeastOneValidKey();

        return res.status(200).json(createResponse('Vérification effectuée', { hasValidKey }));
    } catch (error) {
        console.error('Erreur lors de la vérification des clés API:', error);
        return res.status(500).json(createErrorResponse('Erreur lors de la vérification'));
    }
}

// ==================== HANDLERS LM STUDIO / LOCAL LLM ====================

/**
 * Récupère la liste des modèles disponibles dans LM Studio
 */
async function handleGetLocalLLMModels(req, res) {
    console.log('🏠 handleGetLocalLLMModels: Début');
    try {
        const baseUrl = localLLMConfig.getBaseUrl();
        const activeModel = localLLMConfig.getActiveModel();
        const source = localLLMConfig.getActiveModelSource();

        // Appeler l'endpoint /models de LM Studio (compatible OpenAI)
        let models = [];
        let connected = false;

        try {
            const { fetchWithTimeout } = require('./utils/fetch.js');
            const response = await fetchWithTimeout(`${baseUrl}/models`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }, 10000); // timeout court de 10s

            if (response.ok) {
                const data = await response.json();
                models = (data.data || []).map(m => ({
                    id: m.id,
                    object: m.object || 'model',
                    owned_by: m.owned_by || 'local'
                }));
                connected = true;
            }
        } catch (fetchError) {
            console.warn('⚠️ LM Studio non joignable:', fetchError.message);
            connected = false;
        }

        return res.status(200).json(createResponse('Modèles récupérés', {
            connected,
            baseUrl,
            activeModel,
            activeModelSource: source,
            envModel: localLLMConfig.getEnvModel(),
            models
        }));
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des modèles:', error);
        return res.status(500).json(createErrorResponse('Erreur lors de la récupération des modèles: ' + error.message));
    }
}

/**
 * Retourne le statut de connexion à LM Studio
 */
async function handleGetLocalLLMStatus(req, res) {
    console.log('🏠 handleGetLocalLLMStatus: Début');
    try {
        const baseUrl = localLLMConfig.getBaseUrl();
        const activeModel = localLLMConfig.getActiveModel();
        const source = localLLMConfig.getActiveModelSource();
        let connected = false;

        try {
            const { fetchWithTimeout } = require('./utils/fetch.js');
            const response = await fetchWithTimeout(`${baseUrl}/models`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }, 5000);
            connected = response.ok;
        } catch (_e) {
            connected = false;
        }

        return res.status(200).json(createResponse('Statut LM Studio', {
            connected,
            baseUrl,
            activeModel,
            activeModelSource: source,
            envModel: localLLMConfig.getEnvModel(),
            ocrMode: (process.env.OCR_MODE || 'llm').toLowerCase().trim()
        }));
    } catch (error) {
        console.error('❌ Erreur lors de la vérification du statut:', error);
        return res.status(500).json(createErrorResponse('Erreur lors de la vérification du statut'));
    }
}

/**
 * Change le modèle actif du LLM local
 */
async function handleSetLocalLLMModel(req, res) {
    console.log('🏠 handleSetLocalLLMModel: Début');
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { modelId } = body;

        if (modelId === null || modelId === undefined) {
            // Restaurer le défaut du .env
            localLLMConfig.setActiveModel(null);
            return res.status(200).json(createResponse('Modèle restauré au défaut', {
                activeModel: localLLMConfig.getActiveModel(),
                activeModelSource: 'env'
            }));
        }

        if (typeof modelId !== 'string' || modelId.trim().length === 0) {
            return res.status(400).json(createErrorResponse('modelId requis (string non vide ou null pour restaurer)'));
        }

        localLLMConfig.setActiveModel(modelId.trim());

        return res.status(200).json(createResponse('Modèle changé avec succès', {
            activeModel: localLLMConfig.getActiveModel(),
            activeModelSource: 'ui'
        }));
    } catch (error) {
        console.error('❌ Erreur lors du changement de modèle:', error);
        return res.status(500).json(createErrorResponse('Erreur lors du changement de modèle: ' + error.message));
    }
}

// ==================== HANDLER PROVIDERS STATUS ====================

/**
 * Retourne le statut de tous les providers IA (clé configurée + joignable)
 */
async function handleGetProviders(req, res) {
    console.log('🔌 handleGetProviders: Début');
    try {
        const { fetchWithTimeout } = require('./utils/fetch.js');
        const { isLocalLLMAvailable } = require('./utils/validation.js');
        const { LOCAL_LLM_BASE_URL, OPENAI_BASE_URL, GEMINI_BASE_URL, DEEPSEEK_BASE_URL, GROQ_BASE_URL, MISTRAL_BASE_URL, KIMI_BASE_URL } = require('./utils/constants.js');

        // Définition des providers avec leur check
        const providerDefs = [
            {
                name: 'LocalLLM',
                label: 'LM Studio',
                keyConfigured: isLocalLLMAvailable(),
                model: localLLMConfig.getActiveModel(),
                checkUrl: `${localLLMConfig.getBaseUrl()}/models`,
                timeout: 15000
            },
            {
                name: 'OpenAI',
                label: 'OpenAI',
                keyConfigured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && process.env.OPENAI_API_KEY.length > 20),
                model: 'gpt-4o',
                checkUrl: `${OPENAI_BASE_URL}/models`,
                checkHeaders: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
                timeout: 10000
            },
            {
                name: 'Gemini',
                label: 'Google Gemini',
                keyConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 20),
                model: 'gemini-flash-latest',
                checkUrl: `${GEMINI_BASE_URL}/models?key=${process.env.GEMINI_API_KEY || ''}`,
                timeout: 10000
            },
            {
                name: 'DeepSeek',
                label: 'DeepSeek',
                keyConfigured: !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.startsWith('sk-') && process.env.DEEPSEEK_API_KEY.length > 20),
                model: 'deepseek-chat',
                checkUrl: `${DEEPSEEK_BASE_URL}/models`,
                checkHeaders: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
                timeout: 10000
            },
            {
                name: 'Groq',
                label: 'Groq',
                keyConfigured: !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 20),
                model: 'llama-3.3-70b-versatile',
                checkUrl: `${GROQ_BASE_URL}/models`,
                checkHeaders: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
                timeout: 10000
            },
            {
                name: 'Mistral',
                label: 'Mistral',
                keyConfigured: !!(process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY.length > 20),
                model: 'mistral-large-latest',
                checkUrl: `${MISTRAL_BASE_URL}/models`,
                checkHeaders: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` },
                timeout: 10000
            },
            {
                name: 'Kimi',
                label: 'Kimi (Moonshot)',
                keyConfigured: !!(process.env.KIMI_API_KEY && process.env.KIMI_API_KEY.startsWith('sk-') && process.env.KIMI_API_KEY.length > 20),
                model: 'moonshot-v1-8k',
                checkUrl: `${KIMI_BASE_URL}/models`,
                checkHeaders: { 'Authorization': `Bearer ${process.env.KIMI_API_KEY}` },
                timeout: 10000
            }
        ];

        // Vérifier la connectivité en parallèle pour chaque provider configuré
        const providers = await Promise.all(providerDefs.map(async (def) => {
            let reachable = false;

            if (def.keyConfigured) {
                try {
                    const opts = {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json', ...(def.checkHeaders || {}) }
                    };
                    const response = await fetchWithTimeout(def.checkUrl, opts, def.timeout);
                    reachable = response.ok;
                } catch (_e) {
                    reachable = false;
                }
            }

            return {
                name: def.name,
                label: def.label,
                keyConfigured: def.keyConfigured,
                reachable,
                model: def.model
            };
        }));

        return res.status(200).json(createResponse('Providers IA', { providers }));
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des providers:', error);
        return res.status(500).json(createErrorResponse('Erreur lors de la récupération des providers: ' + error.message));
    }
}
