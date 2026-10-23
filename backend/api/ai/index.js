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
const { generateCoursePageFromImages, COURSE_PAGE_TIMEOUT_MS } = require('./services/coursePageGenerator.js');
const localLLMConfig = require('./services/aiProviders/localLLMConfig.js');
const providerSettings = require('./services/aiProviders/providerSettings.js');
const coursePageConfig = require('./services/coursePageConfig.js');

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

        if (pathname === '/generate-course-page' && method === 'POST') {
            return await handleGenerateCoursePage(req, res);
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

        if (pathname === '/local-llm/url' && method === 'POST') {
            return await handleSetLocalLLMUrl(req, res);
        }

        // Routes des providers à clé API (clé et modèle enregistrés depuis l'interface)
        if (pathname === '/providers/config' && method === 'GET') {
            return await handleGetProvidersConfig(req, res);
        }

        const providerRoute = pathname.match(PROVIDER_ROUTE_PATTERN);
        if (providerRoute) {
            const name = providerSettings.resolveName(providerRoute[1]);
            const action = providerRoute[2];
            if (!name) {
                return res.status(404).json(createErrorResponse(`Provider inconnu : ${providerRoute[1]}`));
            }
            if (action === 'config' && method === 'POST') {
                return await handleSetProviderConfig(name, req, res);
            }
            if (action === 'key' && method === 'DELETE') {
                return await handleDeleteProviderKey(name, res);
            }
            if (action === 'models' && method === 'GET') {
                return await handleGetProviderModels(name, res);
            }
        }

        // Provider IA utilisé pour la génération de pages de cours
        if (pathname === '/course-page/provider' && method === 'GET') {
            return await handleGetCoursePageProvider(req, res);
        }

        if (pathname === '/course-page/provider' && method === 'POST') {
            return await handleSetCoursePageProvider(req, res);
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
 * Génère une page HTML d'entraînement à partir des photos d'une leçon / d'un contrôle
 * Multipart : file_i (images), fileCount, childProfile (JSON), subject, topic, instructions
 * La page n'est pas publiée ici : le parent la relit puis la publie via /course-pages
 */
async function handleGenerateCoursePage(req, res) {
    // La génération d'une page complète dépasse le timeout global du serveur (180s)
    req.setTimeout(COURSE_PAGE_TIMEOUT_MS + 30000);
    res.setTimeout(COURSE_PAGE_TIMEOUT_MS + 30000);

    try {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json(createErrorResponse('Photos requises (multipart/form-data)'));
        }

        const { fields = {}, files = [] } = await parseFormData(req);
        const fileCount = parseInt(fields.fileCount || '0', 10);
        const images = [];
        for (let i = 0; i < fileCount; i++) {
            const file = files.find(f => f.fieldname === `file_${i}`);
            const mimeType = fields[`file_${i}_type`] || file?.mimetype || '';
            if (file && mimeType.startsWith('image/')) {
                images.push({ base64: bufferToBase64(file.buffer), mimeType });
            }
        }
        if (images.length === 0) {
            return res.status(400).json(createErrorResponse('Au moins une photo (image) est requise'));
        }

        let childProfile;
        try {
            childProfile = JSON.parse(fields.childProfile || 'null');
        } catch {
            childProfile = null;
        }
        if (!childProfile || typeof childProfile !== 'object') {
            return res.status(400).json(createErrorResponse('Profil enfant requis'));
        }

        const result = await generateCoursePageFromImages({
            images,
            childProfile: { name: childProfile.name, level: childProfile.level },
            subject: String(fields.subject || '').slice(0, 100),
            topic: String(fields.topic || '').slice(0, 255),
            instructions: String(fields.instructions || '').slice(0, 2000)
        });

        return res.status(200).json(createResponse('Page de cours générée avec succès', result));
    } catch (error) {
        console.error('❌ Erreur lors de la génération de la page de cours:', {
            message: error.message,
            stack: error.stack?.substring(0, 500)
        });

        if (error.code === 'AI_UNAVAILABLE') {
            return res.status(503).json(createErrorResponse(
                'Impossible de générer la page. Vérifiez la configuration IA (un modèle capable de lire des photos est requis : LM Studio avec un modèle vision, OpenAI, Gemini ou OpenRouter avec un modèle vision).',
                'AI_UNAVAILABLE',
                { reason: error.message }
            ));
        }

        return res.status(500).json(createErrorResponse('Erreur lors de la génération de la page: ' + error.message));
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
            baseUrlSource: localLLMConfig.getBaseUrlSource(),
            envBaseUrl: localLLMConfig.getEnvBaseUrl(),
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
            baseUrlSource: localLLMConfig.getBaseUrlSource(),
            envBaseUrl: localLLMConfig.getEnvBaseUrl(),
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
            await localLLMConfig.setActiveModel(null);
            return res.status(200).json(createResponse('Modèle restauré au défaut', {
                activeModel: localLLMConfig.getActiveModel(),
                activeModelSource: 'env'
            }));
        }

        if (typeof modelId !== 'string' || modelId.trim().length === 0) {
            return res.status(400).json(createErrorResponse('modelId requis (string non vide ou null pour restaurer)'));
        }

        await localLLMConfig.setActiveModel(modelId.trim());

        return res.status(200).json(createResponse('Modèle changé avec succès', {
            activeModel: localLLMConfig.getActiveModel(),
            activeModelSource: 'ui'
        }));
    } catch (error) {
        console.error('❌ Erreur lors du changement de modèle:', error);
        return res.status(500).json(createErrorResponse('Erreur lors du changement de modèle: ' + error.message));
    }
}

/**
 * Change l'URL du LLM local
 * Body: { baseUrl: string|null } (null = retour à LOCAL_LLM_URL du .env)
 */
async function handleSetLocalLLMUrl(req, res) {
    console.log('🏠 handleSetLocalLLMUrl: Début');
    try {
        const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
        if (!('baseUrl' in body)) {
            return res.status(400).json(createErrorResponse('baseUrl requis (null = retour au .env)'));
        }

        const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim().replace(/\/+$/, '') : null;
        if (baseUrl) {
            let parsed = null;
            try {
                parsed = new URL(baseUrl);
            } catch {
                parsed = null;
            }
            if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
                return res.status(400).json(createErrorResponse('URL invalide (ex: http://192.168.1.20:1234/v1)'));
            }
        }

        await localLLMConfig.setBaseUrl(baseUrl || null);
        return res.status(200).json(createResponse('URL LM Studio enregistrée', {
            baseUrl: localLLMConfig.getBaseUrl(),
            baseUrlSource: localLLMConfig.getBaseUrlSource(),
            envBaseUrl: localLLMConfig.getEnvBaseUrl()
        }));
    } catch (error) {
        console.error('❌ Erreur lors du changement d\'URL LM Studio:', error);
        return res.status(500).json(createErrorResponse('Erreur lors du changement d\'URL LM Studio: ' + error.message));
    }
}

// ==================== HANDLERS PROVIDERS À CLÉ API ====================

// /providers/<nom>/config (POST), /providers/<nom>/key (DELETE), /providers/<nom>/models (GET)
const PROVIDER_ROUTE_PATTERN = /^\/providers\/([A-Za-z]+)\/(config|key|models)$/;

/**
 * Retourne les paramètres de chaque provider à clé API (les clés ne sont jamais renvoyées en clair)
 */
async function handleGetProvidersConfig(req, res) {
    return res.status(200).json(createResponse('Configuration des providers', {
        providers: providerSettings.NAMES.map(name => providerSettings.getPublicConfig(name))
    }));
}

/**
 * Enregistre la clé API et/ou le modèle d'un provider
 * Body: { apiKey?: string, model?: string|null } (model null ou vide = retour au défaut)
 * La clé est vérifiée auprès du provider avant d'être enregistrée.
 */
async function handleSetProviderConfig(name, req, res) {
    console.log(`🔑 handleSetProviderConfig: ${name}`);
    const label = providerSettings.getLabel(name);
    try {
        const { fetchWithTimeout } = require('./utils/fetch.js');

        const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
        const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
        const model = typeof body.model === 'string' ? body.model.trim() : body.model;

        if (apiKey === undefined && model === undefined) {
            return res.status(400).json(createErrorResponse('apiKey ou model requis'));
        }

        if (apiKey !== undefined && !providerSettings.isValidKeyFormat(name, apiKey)) {
            const format = providerSettings.getKeyFormat(name);
            return res.status(400).json(createErrorResponse(`Clé ${label} invalide${format ? ` (${format})` : ''}`));
        }

        if (model !== undefined && model !== null && model !== '' && !providerSettings.isValidModel(name, model)) {
            return res.status(400).json(createErrorResponse(`Modèle invalide (${providerSettings.getModelFormatHint(name)})`));
        }

        if (apiKey !== undefined) {
            const { url, headers } = providerSettings.getCheckRequest(name, apiKey);
            let response;
            try {
                response = await fetchWithTimeout(url, { method: 'GET', headers }, 10000);
            } catch (fetchError) {
                return res.status(502).json(createErrorResponse(`${label} injoignable, clé non vérifiée : ${fetchError.message}`));
            }
            // Gemini répond 400 à une clé invalide, les autres 401 ou 403
            if ([400, 401, 403].includes(response.status)) {
                return res.status(400).json(createErrorResponse(`Clé refusée par ${label}`));
            }
            if (!response.ok) {
                return res.status(502).json(createErrorResponse(`${label} a répondu ${response.status}, clé non enregistrée`));
            }
            await providerSettings.setApiKey(name, apiKey);
        }

        if (model !== undefined) {
            await providerSettings.setModel(name, model || null);
        }

        return res.status(200).json(createResponse(`Configuration ${label} enregistrée`, providerSettings.getPublicConfig(name)));
    } catch (error) {
        console.error(`❌ Erreur lors de l'enregistrement de la configuration ${label}:`, error);
        return res.status(500).json(createErrorResponse(`Erreur lors de l'enregistrement de la configuration ${label}: ${error.message}`));
    }
}

/**
 * Supprime la clé enregistrée depuis l'interface (retour à la clé du .env)
 */
async function handleDeleteProviderKey(name, res) {
    console.log(`🔑 handleDeleteProviderKey: ${name}`);
    const label = providerSettings.getLabel(name);
    try {
        await providerSettings.setApiKey(name, null);
        return res.status(200).json(createResponse(`Clé ${label} supprimée`, providerSettings.getPublicConfig(name)));
    } catch (error) {
        console.error(`❌ Erreur lors de la suppression de la clé ${label}:`, error);
        return res.status(500).json(createErrorResponse(`Erreur lors de la suppression de la clé ${label}: ${error.message}`));
    }
}

/**
 * Liste les modèles proposés par un provider (suggestions du champ « Modèle »)
 */
async function handleGetProviderModels(name, res) {
    const label = providerSettings.getLabel(name);
    if (!providerSettings.isConfigured(name)) {
        return res.status(400).json(createErrorResponse(`Aucune clé ${label} configurée`));
    }
    try {
        const { fetchWithTimeout } = require('./utils/fetch.js');
        const { url, headers } = providerSettings.getModelsRequest(name);
        const response = await fetchWithTimeout(url, { method: 'GET', headers }, 15000);
        if (!response.ok) {
            return res.status(502).json(createErrorResponse(`${label} a répondu ${response.status}`));
        }
        const models = providerSettings.parseModels(name, await response.json());
        return res.status(200).json(createResponse(`Modèles ${label}`, { models }));
    } catch (error) {
        console.warn(`⚠️ Liste des modèles ${label} indisponible:`, error.message);
        return res.status(502).json(createErrorResponse(`Liste des modèles ${label} indisponible : ${error.message}`));
    }
}

// ==================== HANDLERS PAGE DE COURS ====================

const COURSE_PAGE_PROVIDER_LABELS = {
    LocalLLM: 'LM Studio',
    OpenAI: 'OpenAI',
    Gemini: 'Google Gemini',
    OpenRouter: 'OpenRouter'
};

function getCoursePageProviderPayload() {
    const { getProviderByName } = require('./services/aiProviders/index.js');
    return {
        provider: coursePageConfig.getProvider(),
        options: coursePageConfig.VISION_PROVIDERS.map(name => {
            const instance = getProviderByName(name);
            return {
                name,
                label: COURSE_PAGE_PROVIDER_LABELS[name] || name,
                configured: !!instance?.isAvailable(),
                model: instance?.model || ''
            };
        })
    };
}

/**
 * Retourne le provider choisi pour les pages de cours et les providers vision possibles
 */
async function handleGetCoursePageProvider(req, res) {
    return res.status(200).json(createResponse('Provider des pages de cours', getCoursePageProviderPayload()));
}

/**
 * Enregistre le provider des pages de cours
 * Body: { provider: string|null } (null = automatique)
 */
async function handleSetCoursePageProvider(req, res) {
    try {
        const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
        if (!('provider' in body)) {
            return res.status(400).json(createErrorResponse('provider requis (null = automatique)'));
        }
        const provider = body.provider || null;
        if (provider !== null && !coursePageConfig.VISION_PROVIDERS.includes(provider)) {
            return res.status(400).json(createErrorResponse(`Provider invalide (valeurs possibles : ${coursePageConfig.VISION_PROVIDERS.join(', ')})`));
        }
        await coursePageConfig.setProvider(provider);
        return res.status(200).json(createResponse('Provider des pages de cours enregistré', getCoursePageProviderPayload()));
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement du provider des pages de cours:', error);
        return res.status(500).json(createErrorResponse('Erreur lors de l\'enregistrement du provider des pages de cours: ' + error.message));
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

        // LM Studio puis les providers à clé API, dans l'ordre de priorité
        const providerDefs = [
            {
                name: 'LocalLLM',
                label: 'LM Studio',
                keyConfigured: isLocalLLMAvailable(),
                model: localLLMConfig.getActiveModel(),
                check: { url: `${localLLMConfig.getBaseUrl()}/models`, headers: {} },
                timeout: 15000
            },
            ...providerSettings.NAMES.map(name => ({
                name,
                label: providerSettings.getLabel(name),
                keyConfigured: providerSettings.isConfigured(name),
                model: providerSettings.getModel(name),
                check: providerSettings.getCheckRequest(name),
                timeout: 10000
            }))
        ];

        // Vérifier la connectivité en parallèle pour chaque provider configuré
        const providers = await Promise.all(providerDefs.map(async (def) => {
            let reachable = false;

            if (def.keyConfigured) {
                try {
                    const opts = {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json', ...def.check.headers }
                    };
                    const response = await fetchWithTimeout(def.check.url, opts, def.timeout);
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
