const { sql } = require('../lib/database.js');
const { authenticateToken } = require('../lib/auth.js');
const { setCorsHeaders, handleCors } = require('../lib/cors.js');
const { createResponse, createErrorResponse } = require('../lib/response.js');
const Tesseract = require('tesseract.js');

// URLs des APIs
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';

// Timeout pour les appels API externes (30s max pour éviter timeout Vercel 60s)
const API_TIMEOUT_MS = 30000;

/**
 * Fonction helper pour fetch avec timeout
 * Évite les timeouts Vercel en limitant la durée des appels API externes
 * Suit les bonnes pratiques avec AbortController et finally block
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    // Gérer les erreurs d'abort (timeout)
    if (error.name === 'AbortError') {
      throw new Error(`Timeout API après ${timeoutMs}ms`);
    }
    // Propager les autres erreurs
    throw error;
  } finally {
    // Toujours nettoyer le timeout, même en cas d'erreur
    clearTimeout(timeoutId);
  }
}

/**
 * Gère les erreurs de réponse OpenAI avec gestion spécifique du rate limiting (429)
 */
async function handleOpenAIResponse(response, operation = 'OpenAI') {
  if (!response.ok) {
    // Gérer spécifiquement l'erreur 429 (Rate Limit)
    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      const retryAfter = response.headers.get('retry-after');
      const message = errorData.error?.message || 'Limite de requêtes atteinte';
      console.warn(`⚠️ ${operation} Rate Limit (429): ${message}${retryAfter ? ` - Retry after ${retryAfter}s` : ''}`);
      throw new Error(`OpenAI Rate Limit: ${message}. Basculement vers alternative...`);
    }
    
    // Autres erreurs HTTP
    const errorText = await response.text().catch(() => '');
    console.error(`❌ Erreur ${operation} ${response.status}:`, errorText.substring(0, 200));
    throw new Error(`Erreur ${operation}: ${response.status} - ${response.statusText}`);
  }
  return response;
}

/**
 * Gestionnaire pour les fonctionnalités IA
 */
module.exports = async function handler(req, res) {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req, res);
  }

  setCorsHeaders(res);

  let url;
  try {
    // Authentification requise pour toutes les routes IA
    try {
      const user = authenticateToken(req);
      // Si on arrive ici, l'authentification a réussi
    } catch (authError) {
      console.error('❌ Erreur d\'authentification:', authError.message);
      return res.status(401).json(createErrorResponse('Token d\'authentification invalide ou manquant'));
    }

    const { method } = req;
    url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Routes IA
    if (pathname === '/api/ai/generate-quiz-from-image' && method === 'POST') {
      return await handleGenerateQuizFromImage(req, res);
    }
    
    if (pathname === '/api/ai/generate-quiz-from-documents' && method === 'POST') {
      return await handleGenerateQuizFromDocuments(req, res);
    }
    
    if (pathname === '/api/ai/generate-quiz-from-text' && method === 'POST') {
      return await handleGenerateQuizFromText(req, res);
    }
    
    if (pathname === '/api/ai/validate-key' && method === 'GET') {
      return await handleValidateKey(req, res);
    }
    
    if (pathname === '/api/ai/has-valid-key' && method === 'GET') {
      return await handleHasValidKey(req, res);
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
    return res.status(500).json(createErrorResponse('Erreur serveur interne: ' + error.message));
  }
};

/**
 * Génère un quiz à partir d'une image
 */
async function handleGenerateQuizFromImage(req, res) {
  try {
    let imageBase64, childProfile;
    
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

    if (!imageBase64 || !childProfile) {
      return res.status(400).json(createErrorResponse('Image et profil enfant requis'));
    }

    // Analyser l'image puis générer le quiz
    const analysis = await analyzeImage(imageBase64);
    const quiz = await generateQuizFromAnalysis(analysis, childProfile);

    return res.status(200).json(createResponse('Quiz généré avec succès', { quiz }));
  } catch (error) {
    console.error('Erreur lors de la génération du quiz depuis image:', error);
    return res.status(500).json(createErrorResponse('Erreur lors de la génération du quiz: ' + error.message));
  }
}

/**
 * Parse FormData pour Vercel Functions
 * Vercel Functions avec @vercel/node peut parser FormData automatiquement
 * Cette fonction gère les deux cas : parsing automatique et manuel
 */
async function parseFormData(req) {
  // Vérifier si c'est déjà un objet parsé (Vercel peut le faire automatiquement)
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    // Si le body contient déjà les champs, c'est que Vercel l'a déjà parsé
    if (req.body.file_0 || req.body.childProfile) {
      return req.body;
    }
  }

  // Si le body est un buffer ou une string, essayer de parser avec busboy
  let Busboy;
  try {
    // Essayer d'abord @fastify/busboy (recommandé pour Vercel)
    Busboy = require('@fastify/busboy');
    console.log('✅ @fastify/busboy chargé avec succès');
  } catch (e) {
    console.warn('⚠️ @fastify/busboy non disponible, tentative avec busboy standard...');
    // Si @fastify/busboy n'est pas disponible, essayer avec busboy standard
    try {
      Busboy = require('busboy');
      console.log('✅ busboy standard chargé avec succès');
    } catch (e2) {
      console.error('❌ Erreur lors du chargement de busboy:', e2.message);
      throw new Error('Impossible de parser FormData: busboy non disponible. Veuillez installer @fastify/busboy avec: npm install @fastify/busboy');
    }
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    const files = [];

    busboy.on('file', (fieldname, file, info) => {
      // @fastify/busboy peut avoir différentes signatures selon la version
      // Support pour les deux formats possibles
      let filename, mimetype;
      if (info) {
        filename = info.filename || info.name || 'unknown';
        mimetype = info.mimeType || info.mimetype || 'application/octet-stream';
      } else {
        // Si info n'est pas fourni, utiliser les valeurs par défaut
        filename = 'unknown';
        mimetype = 'application/octet-stream';
      }
      
      const chunks = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      file.on('end', () => {
        files.push({
          fieldname,
          filename,
          mimetype,
          buffer: Buffer.concat(chunks)
        });
      });
      file.on('error', (err) => {
        reject(err);
      });
    });

    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value;
    });

    busboy.on('finish', () => {
      resolve({ fields, files });
    });

    busboy.on('error', (err) => {
      reject(err);
    });

    // Parser le body
    // Pour Vercel Functions, le body peut être dans différentes formes
    if (req.body) {
      if (Buffer.isBuffer(req.body)) {
        // Body est un Buffer
        busboy.end(req.body);
      } else if (typeof req.body === 'string') {
        // Body est une string, convertir en Buffer
        busboy.end(Buffer.from(req.body, 'binary'));
      } else if (req.body instanceof Uint8Array) {
        // Body est un Uint8Array (cas Vercel)
        busboy.end(Buffer.from(req.body));
      } else {
        // Si c'est déjà un objet, essayer de le convertir
        console.warn('⚠️ Body est un objet, tentative de résolution directe');
        resolve(req.body);
      }
    } else {
      // Pour Vercel Functions, le body peut être dans req directement
      // Vérifier si req est un stream
      if (req.on && typeof req.pipe === 'function') {
        // req est un stream, le pipe vers busboy
        req.pipe(busboy);
      } else if (req.rawBody) {
        // Vercel peut mettre le body brut dans rawBody
        if (Buffer.isBuffer(req.rawBody)) {
          busboy.end(req.rawBody);
        } else if (typeof req.rawBody === 'string') {
          busboy.end(Buffer.from(req.rawBody, 'binary'));
        } else {
          reject(new Error('rawBody dans un format non supporté'));
        }
      } else {
        // Aucun body disponible
        reject(new Error('Body vide et pas de stream disponible. Vérifiez que la requête contient bien des données FormData.'));
      }
    }
  });
}

/**
 * Convertit un buffer en base64
 */
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

/**
 * Génère un quiz à partir de plusieurs documents
 * Supporte maintenant FormData pour éviter les erreurs 413
 */
async function handleGenerateQuizFromDocuments(req, res) {
  try {
    console.log('🔍 Début de handleGenerateQuizFromDocuments');
    console.log('📋 Content-Type:', req.headers['content-type']);
    
    const contentType = req.headers['content-type'] || '';
    const isFormData = contentType.includes('multipart/form-data');
    
    let documents = [];
    let childProfile;
    let questionCount = 5;
    
    if (isFormData) {
      // Parser FormData
      console.log('📦 Parsing FormData...');
      const parsed = await parseFormData(req);
      
      // Extraire les fichiers et métadonnées
      if (parsed.files && parsed.fields) {
        // Format avec busboy
        const fileCount = parseInt(parsed.fields.fileCount || '0');
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

    console.log(`📝 Analyse de ${documents.length} document(s)...`);

    // Analyser tous les documents
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
          console.log(`🖼️ Analyse de l'image ${i + 1}...`);
          const analysis = await analyzeImage(imageData);
          analyses.push({ type: 'image', fileName: doc.name, analysis });
          console.log(`✅ Image ${i + 1} analysée avec succès`);
        } else if (doc.type === 'application/pdf' || doc.type === 'pdf') {
          // Pour PDF, simuler une analyse (dans une vraie implémentation, utiliser OCR)
          console.log(`📑 Traitement du PDF ${i + 1}...`);
          analyses.push({
            type: 'pdf',
            fileName: doc.name,
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

    console.log('✅ Quiz généré avec succès');
    return res.status(200).json(createResponse('Quiz généré avec succès', { quiz }));
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
 * Génère un quiz à partir d'un texte
 */
async function handleGenerateQuizFromText(req, res) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { text, childProfile, options = {} } = body;

    if (!text || !childProfile) {
      return res.status(400).json(createErrorResponse('Texte et profil enfant requis'));
    }

    const quiz = await generateQuizFromTextWithAI(text, childProfile, options);

    return res.status(200).json(createResponse('Quiz généré avec succès', { quiz }));
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
  try {
    const hasValidKey = await hasAtLeastOneValidKey();

    return res.status(200).json(createResponse('Vérification effectuée', { hasValidKey }));
  } catch (error) {
    console.error('Erreur lors de la vérification des clés API:', error);
    return res.status(500).json(createErrorResponse('Erreur lors de la vérification'));
  }
}

// ==================== FONCTIONS HELPER IA ====================

/**
 * Extrait le texte d'une image en utilisant Tesseract OCR
 * @param {string} base64Image - Image en base64
 * @returns {Promise<string>} Texte extrait de l'image
 */
async function extractTextFromImage(base64Image) {
  try {
    console.log('🔍 Début de l\'extraction OCR...');
    
    // Convertir base64 en buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Utiliser Tesseract pour extraire le texte
    // Configuration pour le français et l'anglais
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'fra+eng', {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          console.log(`📝 OCR: ${Math.round(info.progress * 100)}%`);
        }
      }
    });
    
    const extractedText = text.trim();
    console.log(`✅ Texte extrait (${extractedText.length} caractères)`);
    
    if (!extractedText || extractedText.length === 0) {
      console.warn('⚠️ Aucun texte extrait de l\'image');
      return 'Aucun texte détecté dans l\'image.';
    }
    
    return extractedText;
  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction OCR:', error);
    throw new Error(`Erreur OCR: ${error.message}`);
  }
}

/**
 * Analyse une image avec l'IA en utilisant OCR
 * Extrait d'abord le texte avec Tesseract, puis envoie le texte au LLM
 */
async function analyzeImage(base64Image) {
  try {
    // Extraire le texte de l'image avec OCR
    const extractedText = await extractTextFromImage(base64Image);
    
    // Analyser le texte extrait avec les LLM
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const mistralApiKey = process.env.MISTRAL_API_KEY;

    // Essayer d'abord OpenAI
    if (isValidOpenAIKey(openaiApiKey)) {
      try {
        return await analyzeTextWithOpenAI(extractedText);
      } catch (error) {
        // Détecter spécifiquement les erreurs de rate limiting
        if (error.message.includes('Rate Limit') || error.message.includes('429')) {
          console.warn('⚠️ OpenAI Rate Limit détecté, basculement automatique vers Gemini...');
        } else {
          console.warn('⚠️ Erreur OpenAI, tentative avec Gemini:', error.message);
        }
      }
    }

    // Essayer Gemini si OpenAI échoue
    if (isValidGeminiKey(geminiApiKey)) {
      try {
        return await analyzeTextWithGemini(extractedText);
      } catch (error) {
        console.warn('Erreur Gemini, tentative avec DeepSeek:', error.message);
      }
    }

    // Essayer DeepSeek si Gemini échoue
    if (isValidDeepSeekKey(deepseekApiKey)) {
      try {
        return await analyzeTextWithDeepSeek(extractedText);
      } catch (error) {
        console.warn('Erreur DeepSeek, tentative avec Groq:', error.message);
      }
    }

    // Essayer Groq si DeepSeek échoue
    if (isValidGroqKey(groqApiKey)) {
      try {
        return await analyzeTextWithGroq(extractedText);
      } catch (error) {
        console.warn('Erreur Groq, tentative avec Mistral:', error.message);
      }
    }

    // Essayer Mistral si Groq échoue
    if (isValidMistralKey(mistralApiKey)) {
      try {
        return await analyzeTextWithMistral(extractedText);
      } catch (error) {
        console.warn('Erreur Mistral:', error.message);
      }
    }

    // Fallback vers le mode démo
    console.warn('⚠️ Tous les services IA ont échoué, utilisation du mode démo');
    return getDemoAnalysis();
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse de l\'image:', error);
    // En cas d'erreur OCR, retourner une analyse basique
    return getDemoAnalysis();
  }
}

/**
 * Analyse un texte extrait d'une image avec OpenAI
 * @param {string} extractedText - Texte extrait de l'image par OCR
 * @returns {Promise<Object>} Analyse structurée du contenu
 */
async function analyzeTextWithOpenAI(extractedText) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  const response = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
        }
      ],
      max_tokens: 1000
    })
  });

  await handleOpenAIResponse(response, 'OpenAI (analyse texte OCR)');

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parser le JSON de la réponse
  try {
    return JSON.parse(content);
  } catch (e) {
    // Essayer d'extraire le JSON si entouré de markdown
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Impossible de parser la réponse OpenAI');
  }
}

/**
 * Analyse un texte extrait d'une image avec Gemini
 * @param {string} extractedText - Texte extrait de l'image par OCR
 * @returns {Promise<Object>} Analyse structurée du contenu
 */
async function analyzeTextWithGemini(extractedText, retryCount = 0) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const maxRetries = 1; // Réduit de 2 à 1 pour éviter timeout
  
  try {
    const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur Gemini: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error('Réponse Gemini incomplète');
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Nettoyer le texte pour extraire le JSON
    let jsonText = responseText.trim();
    
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      
      if (!parsed.titre_principal && !parsed.concepts_cles) {
        throw new Error('Structure JSON invalide');
      }
      
      return parsed;
    } catch (parseError) {
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Délai réduit à 500ms
        return analyzeTextWithGemini(extractedText, retryCount + 1);
      }
      throw new Error('Impossible de parser la réponse de Gemini');
    }
  } catch (error) {
    if (retryCount < maxRetries && error.message.includes('tronquée')) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Délai réduit à 500ms
      return analyzeTextWithGemini(extractedText, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Analyse un texte extrait d'une image avec Groq
 * @param {string} extractedText - Texte extrait de l'image par OCR
 * @returns {Promise<Object>} Analyse structurée du contenu
 */
async function analyzeTextWithGroq(extractedText) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  const response = await fetchWithTimeout(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Groq: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Groq:', parseError);
    throw new Error('Impossible de parser la réponse de Groq');
  }
}

/**
 * Analyse un texte extrait d'une image avec DeepSeek
 * @param {string} extractedText - Texte extrait de l'image par OCR
 * @returns {Promise<Object>} Analyse structurée du contenu
 */
async function analyzeTextWithDeepSeek(extractedText) {
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  
  const response = await fetchWithTimeout(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur DeepSeek: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON DeepSeek:', parseError);
    throw new Error('Impossible de parser la réponse de DeepSeek');
  }
}

/**
 * Analyse un texte extrait d'une image avec Mistral
 * @param {string} extractedText - Texte extrait de l'image par OCR
 * @returns {Promise<Object>} Analyse structurée du contenu
 */
async function analyzeTextWithMistral(extractedText) {
  const mistralApiKey = process.env.MISTRAL_API_KEY;
  
  const response = await fetchWithTimeout(`${MISTRAL_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mistralApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'user',
          content: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Mistral: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Mistral:', parseError);
    throw new Error('Impossible de parser la réponse de Mistral');
  }
}

/**
 * Génère un quiz basé sur l'analyse
 */
async function generateQuizFromAnalysis(analysis, childProfile) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  const errors = [];

  // Essayer d'abord OpenAI
  if (isValidOpenAIKey(openaiApiKey)) {
    try {
      return await generateQuizWithOpenAI(analysis, childProfile);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`OpenAI: ${errorMsg}`);
      // Détecter spécifiquement les erreurs de rate limiting
      if (error.message.includes('Rate Limit') || error.message.includes('429')) {
        console.warn('⚠️ OpenAI Rate Limit détecté, basculement automatique vers Gemini...');
      } else {
        console.warn('⚠️ Erreur OpenAI, tentative avec Gemini:', errorMsg);
      }
    }
  } else {
    errors.push('OpenAI: Clé API non configurée ou invalide');
  }

  // Essayer Gemini si OpenAI échoue
  if (isValidGeminiKey(geminiApiKey)) {
    try {
      return await generateQuizWithGemini(analysis, childProfile);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Gemini: ${errorMsg}`);
      console.warn('Erreur Gemini, tentative avec DeepSeek:', errorMsg);
    }
  } else {
    errors.push('Gemini: Clé API non configurée ou invalide');
  }

  // Essayer DeepSeek si Gemini échoue (3ème position)
  if (isValidDeepSeekKey(process.env.DEEPSEEK_API_KEY)) {
    try {
      return await generateQuizWithDeepSeek(analysis, childProfile);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`DeepSeek: ${errorMsg}`);
      console.warn('Erreur DeepSeek, tentative avec Groq:', errorMsg);
    }
  } else {
    errors.push('DeepSeek: Clé API non configurée ou invalide');
  }

  // Essayer Groq si DeepSeek échoue
  if (isValidGroqKey(groqApiKey)) {
    try {
      return await generateQuizWithGroq(analysis, childProfile);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Groq: ${errorMsg}`);
      console.warn('Erreur Groq, tentative avec Mistral:', errorMsg);
    }
  } else {
    errors.push('Groq: Clé API non configurée ou invalide');
  }

  // Essayer Mistral si Groq échoue
  if (isValidMistralKey(process.env.MISTRAL_API_KEY)) {
    try {
      return await generateQuizWithMistral(analysis, childProfile);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Mistral: ${errorMsg}`);
      console.warn('Erreur Mistral:', errorMsg);
    }
  } else {
    errors.push('Mistral: Clé API non configurée ou invalide');
  }

  // Si tous les services ont échoué, lancer une erreur au lieu de retourner un quiz démo
  const errorMessage = `Impossible de générer le quiz. Tous les services IA ont échoué:\n${errors.join('\n')}`;
  console.error('❌ Tous les services IA ont échoué:', errors);
  throw new Error(errorMessage);
}

/**
 * Génère un quiz avec OpenAI
 */
async function generateQuizWithOpenAI(analysis, childProfile) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  const response = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.`
        },
        {
          role: 'user',
          content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de 5 questions avec 4 options chacune. Format de réponse: JSON avec structure {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 1500
    })
  });

  await handleOpenAIResponse(response, 'OpenAI (génération quiz)');

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Impossible de parser la réponse OpenAI');
  }
}

/**
 * Génère un quiz avec Gemini
 */
async function generateQuizWithGemini(analysis, childProfile, retryCount = 0) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const maxRetries = 1; // Réduit de 2 à 1 pour éviter timeout
  
  try {
    const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants.

L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.

Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, 
générez un quiz de 5 questions avec 4 options chacune. 

IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. 
Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 3000,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur Gemini: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error('Réponse Gemini incomplète');
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Nettoyer le texte pour extraire le JSON
    let jsonText = responseText.trim();
    
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      
      if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Structure JSON invalide pour le quiz');
      }
      
      // Vérifier que toutes les questions sont complètes
      const validQuestions = parsed.questions.filter(q => 
        q.question && 
        q.options && 
        Array.isArray(q.options) && 
        q.options.length === 4 && 
        typeof q.correctAnswer === 'number'
      );
      
      if (validQuestions.length === 0) {
        throw new Error('Aucune question valide trouvée');
      }
      
      if (validQuestions.length < 3 && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Délai réduit à 500ms
        return generateQuizWithGemini(analysis, childProfile, retryCount + 1);
      }
      
      return {
        ...parsed,
        questions: validQuestions
      };
      
    } catch (parseError) {
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Délai réduit à 500ms
        return generateQuizWithGemini(analysis, childProfile, retryCount + 1);
      }
      
      return getDemoQuiz(childProfile);
    }
  } catch (error) {
    if (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Délai réduit à 500ms
      return generateQuizWithGemini(analysis, childProfile, retryCount + 1);
    }
    
    return getDemoQuiz(childProfile);
  }
}

/**
 * Génère un quiz avec Groq
 */
async function generateQuizWithGroq(analysis, childProfile) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  const response = await fetchWithTimeout(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.`
        },
        {
          role: 'user',
          content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de 5 questions avec 4 options chacune. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Groq: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Groq:', parseError);
    throw new Error('Impossible de parser la réponse de Groq');
  }
}

/**
 * Génère un quiz avec DeepSeek
 */
async function generateQuizWithDeepSeek(analysis, childProfile) {
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  
  const response = await fetchWithTimeout(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.`
        },
        {
          role: 'user',
          content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de 5 questions avec 4 options chacune. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur DeepSeek: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON DeepSeek:', parseError);
    throw new Error('Impossible de parser la réponse de DeepSeek');
  }
}

/**
 * Génère un quiz avec Mistral
 */
async function generateQuizWithMistral(analysis, childProfile) {
  const mistralApiKey = process.env.MISTRAL_API_KEY;
  
  const response = await fetchWithTimeout(`${MISTRAL_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mistralApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.`
        },
        {
          role: 'user',
          content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de 5 questions avec 4 options chacune. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Mistral: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Mistral:', parseError);
    throw new Error('Impossible de parser la réponse de Mistral');
  }
}

/**
 * Génère un quiz à partir de plusieurs analyses
 */
async function generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  const errors = [];

  // Essayer d'abord OpenAI
  if (isValidOpenAIKey(openaiApiKey)) {
    try {
      return await generateQuizFromMultipleAnalysesWithOpenAI(analyses, childProfile, questionCount);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`OpenAI: ${errorMsg}`);
      // Détecter spécifiquement les erreurs de rate limiting
      if (error.message.includes('Rate Limit') || error.message.includes('429')) {
        console.warn('⚠️ OpenAI Rate Limit détecté, basculement automatique vers Gemini...');
      } else {
        console.warn('⚠️ Erreur OpenAI, tentative avec Gemini:', errorMsg);
      }
    }
  } else {
    errors.push('OpenAI: Clé API non configurée ou invalide');
  }

  // Essayer Gemini si OpenAI échoue
  if (isValidGeminiKey(geminiApiKey)) {
    try {
      return await generateQuizFromMultipleAnalysesWithGemini(analyses, childProfile, questionCount);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Gemini: ${errorMsg}`);
      console.warn('Erreur Gemini, tentative avec DeepSeek:', errorMsg);
    }
  } else {
    errors.push('Gemini: Clé API non configurée ou invalide');
  }

  // Essayer DeepSeek si Gemini échoue (3ème position)
  if (isValidDeepSeekKey(process.env.DEEPSEEK_API_KEY)) {
    try {
      return await generateQuizFromMultipleAnalysesWithDeepSeek(analyses, childProfile, questionCount);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`DeepSeek: ${errorMsg}`);
      console.warn('Erreur DeepSeek, tentative avec Groq:', errorMsg);
    }
  } else {
    errors.push('DeepSeek: Clé API non configurée ou invalide');
  }

  // Essayer Groq si DeepSeek échoue
  if (isValidGroqKey(groqApiKey)) {
    try {
      return await generateQuizFromMultipleAnalysesWithGroq(analyses, childProfile, questionCount);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Groq: ${errorMsg}`);
      console.warn('Erreur Groq, tentative avec Mistral:', errorMsg);
    }
  } else {
    errors.push('Groq: Clé API non configurée ou invalide');
  }

  // Essayer Mistral si Groq échoue
  if (isValidMistralKey(process.env.MISTRAL_API_KEY)) {
    try {
      return await generateQuizFromMultipleAnalysesWithMistral(analyses, childProfile, questionCount);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Mistral: ${errorMsg}`);
      console.warn('Erreur Mistral:', errorMsg);
    }
  } else {
    errors.push('Mistral: Clé API non configurée ou invalide');
  }

  // Si tous les services ont échoué, lancer une erreur au lieu de retourner un quiz démo
  const errorMessage = `Impossible de générer le quiz. Tous les services IA ont échoué:\n${errors.join('\n')}`;
  console.error('❌ Tous les services IA ont échoué:', errors);
  throw new Error(errorMessage);
}

/**
 * Génère un quiz à partir de plusieurs analyses avec OpenAI
 */
async function generateQuizFromMultipleAnalysesWithOpenAI(analyses, childProfile, questionCount) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  const response = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${questionCount} questions avec 4 options chacune.`
        },
        {
          role: 'user',
          content: `Basé sur ces analyses de documents: ${JSON.stringify(analyses)}, générez un quiz de ${questionCount} questions qui couvre l'ensemble du contenu. Format de réponse: JSON avec structure {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 2000
    })
  });

  await handleOpenAIResponse(response, 'OpenAI (génération quiz multiple)');

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Impossible de parser la réponse OpenAI');
  }
}

/**
 * Génère un quiz à partir de plusieurs analyses avec Gemini
 */
async function generateQuizFromMultipleAnalysesWithGemini(analyses, childProfile, questionCount) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants.
          
L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.
Générez exactement ${questionCount} questions avec 4 options chacune.

Basé sur ces analyses de documents: ${JSON.stringify(analyses)}, 
générez un quiz de ${questionCount} questions qui couvre l'ensemble du contenu.

IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. 
Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }]
      }],
      generationConfig: {
        maxOutputTokens: 3000,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Gemini: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.candidates[0].content.parts[0].text;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Gemini:', parseError);
    throw new Error('Impossible de parser la réponse de Gemini');
  }
}

/**
 * Génère un quiz à partir de plusieurs analyses avec Groq
 */
async function generateQuizFromMultipleAnalysesWithDeepSeek(analyses, childProfile, questionCount) {
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  
  const response = await fetchWithTimeout(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${questionCount} questions avec 4 options chacune.`
        },
        {
          role: 'user',
          content: `Basé sur ces analyses de documents: ${JSON.stringify(analyses)}, générez un quiz de ${questionCount} questions qui couvre l'ensemble du contenu. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 3000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur DeepSeek: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON DeepSeek:', parseError);
    throw new Error('Impossible de parser la réponse de DeepSeek');
  }
}

async function generateQuizFromMultipleAnalysesWithMistral(analyses, childProfile, questionCount) {
  const mistralApiKey = process.env.MISTRAL_API_KEY;
  
  const response = await fetchWithTimeout(`${MISTRAL_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mistralApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${questionCount} questions avec 4 options chacune.`
        },
        {
          role: 'user',
          content: `Basé sur ces analyses de documents: ${JSON.stringify(analyses)}, générez un quiz de ${questionCount} questions qui couvre l'ensemble du contenu. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 3000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Mistral: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Mistral:', parseError);
    throw new Error('Impossible de parser la réponse de Mistral');
  }
}

async function generateQuizFromMultipleAnalysesWithGroq(analyses, childProfile, questionCount) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  const response = await fetchWithTimeout(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${questionCount} questions avec 4 options chacune.`
        },
        {
          role: 'user',
          content: `Basé sur ces analyses de documents: ${JSON.stringify(analyses)}, générez un quiz de ${questionCount} questions qui couvre l'ensemble du contenu. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Groq: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Groq:', parseError);
    throw new Error('Impossible de parser la réponse de Groq');
  }
}

/**
 * Génère un quiz à partir d'un texte avec l'IA
 */
async function generateQuizFromTextWithAI(inputText, childProfile, options = {}) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  const errors = [];

  // Essayer d'abord OpenAI
  if (isValidOpenAIKey(openaiApiKey)) {
    try {
      return await generateQuizFromTextWithOpenAI(inputText, childProfile, options);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`OpenAI: ${errorMsg}`);
      // Détecter spécifiquement les erreurs de rate limiting
      if (error.message.includes('Rate Limit') || error.message.includes('429')) {
        console.warn('⚠️ OpenAI Rate Limit détecté, basculement automatique vers Gemini...');
      } else {
        console.warn('⚠️ Erreur OpenAI, tentative avec Gemini:', errorMsg);
      }
    }
  } else {
    errors.push('OpenAI: Clé API non configurée ou invalide');
  }

  // Essayer Gemini si OpenAI échoue
  if (isValidGeminiKey(geminiApiKey)) {
    try {
      return await generateQuizFromTextWithGemini(inputText, childProfile, options);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Gemini: ${errorMsg}`);
      console.warn('Erreur Gemini, tentative avec DeepSeek:', errorMsg);
    }
  } else {
    errors.push('Gemini: Clé API non configurée ou invalide');
  }

  // Essayer DeepSeek si Gemini échoue (3ème position)
  if (isValidDeepSeekKey(process.env.DEEPSEEK_API_KEY)) {
    try {
      return await generateQuizFromTextWithDeepSeek(inputText, childProfile, options);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`DeepSeek: ${errorMsg}`);
      console.warn('Erreur DeepSeek, tentative avec Groq:', errorMsg);
    }
  } else {
    errors.push('DeepSeek: Clé API non configurée ou invalide');
  }

  // Essayer Groq si DeepSeek échoue
  if (isValidGroqKey(groqApiKey)) {
    try {
      return await generateQuizFromTextWithGroq(inputText, childProfile, options);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Groq: ${errorMsg}`);
      console.warn('Erreur Groq, tentative avec Mistral:', errorMsg);
    }
  } else {
    errors.push('Groq: Clé API non configurée ou invalide');
  }

  // Essayer Mistral si Groq échoue
  if (isValidMistralKey(process.env.MISTRAL_API_KEY)) {
    try {
      return await generateQuizFromTextWithMistral(inputText, childProfile, options);
    } catch (error) {
      const errorMsg = error.message || 'Erreur inconnue';
      errors.push(`Mistral: ${errorMsg}`);
      console.warn('Erreur Mistral:', errorMsg);
    }
  } else {
    errors.push('Mistral: Clé API non configurée ou invalide');
  }

  // Si tous les services ont échoué, lancer une erreur au lieu de retourner un quiz démo
  const errorMessage = `Impossible de générer le quiz. Tous les services IA ont échoué:\n${errors.join('\n')}`;
  console.error('❌ Tous les services IA ont échoué:', errors);
  throw new Error(errorMessage);
}

/**
 * Génère un quiz à partir d'un texte avec OpenAI
 */
async function generateQuizFromTextWithOpenAI(inputText, childProfile, options) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  const response = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${options.questionCount || 5} questions avec 4 options chacune. Niveau de difficulté: ${options.difficulty || 'moyen'}.`
        },
        {
          role: 'user',
          content: `Basé sur ce texte de leçon: "${inputText}", générez un quiz adapté à l'enfant. Format de réponse: JSON avec structure {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 2000
    })
  });

  await handleOpenAIResponse(response, 'OpenAI (génération quiz depuis texte)');

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Impossible de parser la réponse OpenAI');
  }
}

/**
 * Génère un quiz à partir d'un texte avec Gemini
 */
async function generateQuizFromTextWithGemini(inputText, childProfile, options, retryCount = 0) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const maxRetries = 1; // Réduit de 2 à 1 pour éviter timeout
  
  try {
    const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants.
            
L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.
Générez exactement ${options.questionCount || 5} questions avec 4 options chacune.
Niveau de difficulté: ${options.difficulty || 'moyen'}.

Basé sur ce texte de leçon: "${inputText}", 
générez un quiz adapté à l'enfant.

IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. 
Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 3000,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur Gemini: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error('Réponse Gemini incomplète');
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Nettoyer le texte pour extraire le JSON
    let jsonText = responseText.trim();
    
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      
      if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Structure JSON invalide pour le quiz');
      }
      
      return parsed;
      
    } catch (parseError) {
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Délai réduit à 500ms
        return generateQuizFromTextWithGemini(inputText, childProfile, options, retryCount + 1);
      }
      
      return getDemoQuizFromText(childProfile, options);
    }
  } catch (error) {
    if (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Délai réduit à 500ms
      return generateQuizFromTextWithGemini(inputText, childProfile, options, retryCount + 1);
    }
    
    return getDemoQuizFromText(childProfile, options);
  }
}

/**
 * Génère un quiz à partir d'un texte avec DeepSeek
 */
async function generateQuizFromTextWithDeepSeek(inputText, childProfile, options) {
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  
  const response = await fetchWithTimeout(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${options.questionCount || 5} questions avec 4 options chacune. Niveau de difficulté: ${options.difficulty || 'moyen'}.`
        },
        {
          role: 'user',
          content: `Basé sur ce texte de leçon: "${inputText}", générez un quiz adapté à l'enfant. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur DeepSeek: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON DeepSeek:', parseError);
    throw new Error('Impossible de parser la réponse de DeepSeek');
  }
}

/**
 * Génère un quiz à partir d'un texte avec Mistral
 */
async function generateQuizFromTextWithMistral(inputText, childProfile, options) {
  const mistralApiKey = process.env.MISTRAL_API_KEY;
  
  const response = await fetchWithTimeout(`${MISTRAL_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mistralApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${options.questionCount || 5} questions avec 4 options chacune. Niveau de difficulté: ${options.difficulty || 'moyen'}.`
        },
        {
          role: 'user',
          content: `Basé sur ce texte de leçon: "${inputText}", générez un quiz adapté à l'enfant. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Mistral: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Mistral:', parseError);
    throw new Error('Impossible de parser la réponse de Mistral');
  }
}

async function generateQuizFromTextWithGroq(inputText, childProfile, options) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  const response = await fetchWithTimeout(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${options.questionCount || 5} questions avec 4 options chacune. Niveau de difficulté: ${options.difficulty || 'moyen'}.`
        },
        {
          role: 'user',
          content: `Basé sur ce texte de leçon: "${inputText}", générez un quiz adapté à l'enfant. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Groq: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Nettoyer le texte pour extraire le JSON
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Erreur de parsing JSON Groq:', parseError);
    throw new Error('Impossible de parser la réponse de Groq');
  }
}

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Vérifie si une clé API OpenAI est valide
 */
function isValidOpenAIKey(apiKey) {
  return apiKey && 
         apiKey !== 'sk-your-openai-api-key-here' && 
         apiKey.startsWith('sk-') && 
         apiKey.length > 20;
}

/**
 * Vérifie si une clé API Gemini est valide
 */
function isValidGeminiKey(apiKey) {
  return apiKey && 
         apiKey !== 'your-gemini-api-key-here' && 
         apiKey.length > 20;
}

/**
 * Vérifie si une clé API Groq est valide
 */
function isValidGroqKey(apiKey) {
  return apiKey && 
         apiKey !== 'your-groq-api-key-here' && 
         apiKey.length > 20;
}

/**
 * Vérifie si une clé API DeepSeek est valide
 */
function isValidDeepSeekKey(apiKey) {
  return apiKey && 
         apiKey !== 'your-deepseek-api-key-here' && 
         apiKey.startsWith('sk-') && 
         apiKey.length > 20;
}

/**
 * Vérifie si une clé API Mistral est valide
 */
function isValidMistralKey(apiKey) {
  return apiKey && 
         apiKey !== 'your-mistral-api-key-here' && 
         apiKey.startsWith('mistral-') && 
         apiKey.length > 20;
}

/**
 * Fonction helper pour valider une clé API
 */
async function validateApiKey(apiType) {
  let apiKey;
  
  switch (apiType) {
    case 'openai':
      apiKey = process.env.OPENAI_API_KEY;
      return isValidOpenAIKey(apiKey);
    case 'gemini':
      apiKey = process.env.GEMINI_API_KEY;
      return isValidGeminiKey(apiKey);
    case 'deepseek':
      apiKey = process.env.DEEPSEEK_API_KEY;
      return isValidDeepSeekKey(apiKey);
    case 'groq':
      apiKey = process.env.GROQ_API_KEY;
      return isValidGroqKey(apiKey);
    case 'mistral':
      apiKey = process.env.MISTRAL_API_KEY;
      return isValidMistralKey(apiKey);
    default:
      return false;
  }
}

/**
 * Fonction helper pour vérifier si au moins une clé API est valide
 */
async function hasAtLeastOneValidKey() {
  const openaiValid = await validateApiKey('openai');
  const geminiValid = await validateApiKey('gemini');
  const deepseekValid = await validateApiKey('deepseek');
  const groqValid = await validateApiKey('groq');
  const mistralValid = await validateApiKey('mistral');
  
  return openaiValid || geminiValid || deepseekValid || groqValid || mistralValid;
}

// ==================== FONCTIONS DÉMO (FALLBACK) ====================

/**
 * Analyse démo pour les tests
 */
function getDemoAnalysis() {
  return {
    subject: 'Mathématiques',
    topic: 'Les fractions',
    concepts: ['numérateur', 'dénominateur', 'fraction équivalente', 'comparaison'],
    level: 'CM1',
    keyPoints: [
      'Une fraction représente une partie d\'un tout',
      'Le numérateur indique combien de parts on prend',
      'Le dénominateur indique en combien de parts on divise le tout'
    ]
  };
}

/**
 * Quiz démo pour les tests
 */
function getDemoQuiz(childProfile) {
  return {
    title: 'Quiz sur les fractions',
    description: 'Testez vos connaissances sur les fractions',
    subject: 'Mathématiques',
    level: childProfile.age < 10 ? 'Facile' : 'Intermédiaire',
    questions: [
      {
        question: 'Dans la fraction 3/4, que représente le chiffre 3 ?',
        options: [
          'Le dénominateur',
          'Le numérateur',
          'Le diviseur',
          'Le quotient'
        ],
        correctAnswer: 1,
        explanation: 'Le chiffre 3 est le numérateur, il indique combien de parts on prend.'
      },
      {
        question: 'Quelle fraction est équivalente à 1/2 ?',
        options: [
          '2/3',
          '3/6',
          '1/4',
          '2/5'
        ],
        correctAnswer: 1,
        explanation: '3/6 = 1/2 car 3÷3 = 1 et 6÷3 = 2.'
      },
      {
        question: 'Si on partage une pizza en 8 parts égales et qu\'on en mange 3, quelle fraction de la pizza a-t-on mangée ?',
        options: [
          '8/3',
          '3/8',
          '3/5',
          '5/8'
        ],
        correctAnswer: 1,
        explanation: 'On a mangé 3 parts sur 8, donc 3/8 de la pizza.'
      },
      {
        question: 'Quelle est la fraction la plus grande entre 1/3 et 1/4 ?',
        options: [
          '1/3',
          '1/4',
          'Elles sont égales',
          'On ne peut pas comparer'
        ],
        correctAnswer: 0,
        explanation: '1/3 est plus grand que 1/4 car on prend une part plus grande du tout.'
      },
      {
        question: 'Comment écrit-on "un demi" en fraction ?',
        options: [
          '1/1',
          '1/2',
          '2/1',
          '1/4'
        ],
        correctAnswer: 1,
        explanation: 'Un demi signifie qu\'on prend 1 part sur 2, donc 1/2.'
      }
    ]
  };
}

/**
 * Quiz démo pour la génération à partir de plusieurs documents
 */
function getDemoQuizFromDocuments(childProfile, questionCount) {
  const questions = getDemoQuestionsByDifficulty('moyen', questionCount);
  
  return {
    title: 'Quiz multi-documents',
    description: `Quiz généré à partir de ${questionCount} documents - ${questionCount} questions`,
    subject: 'Multi-matières',
    level: childProfile.age < 10 ? 'Primaire' : 'Collège',
    questions: questions
  };
}

/**
 * Quiz démo pour la génération à partir de texte
 */
function getDemoQuizFromText(childProfile, options) {
  const questionCount = parseInt(options.questionCount) || 5;
  const difficulty = options.difficulty || 'moyen';
  
  const questions = getDemoQuestionsByDifficulty(difficulty, questionCount);
  
  return {
    title: options.title || 'Quiz généré à partir de texte',
    description: `Quiz adapté au niveau ${difficulty} - ${questionCount} questions`,
    subject: options.subject || 'Général',
    level: options.level || 'Primaire',
    questions: questions
  };
}

/**
 * Génère des questions démo selon la difficulté
 */
function getDemoQuestionsByDifficulty(difficulty, count) {
  const questionSets = {
    facile: [
      {
        question: 'Quelle est la couleur du ciel par temps clair ?',
        options: ['Rouge', 'Bleu', 'Vert', 'Jaune'],
        correctAnswer: 1,
        explanation: 'Le ciel est bleu par temps clair car la lumière du soleil se disperse dans l\'atmosphère.'
      },
      {
        question: 'Combien y a-t-il de jours dans une semaine ?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 2,
        explanation: 'Une semaine compte 7 jours : lundi, mardi, mercredi, jeudi, vendredi, samedi et dimanche.'
      },
      {
        question: 'Quel animal dit "miaou" ?',
        options: ['Le chien', 'Le chat', 'L\'oiseau', 'Le poisson'],
        correctAnswer: 1,
        explanation: 'Le chat fait "miaou" pour communiquer.'
      }
    ],
    moyen: [
      {
        question: 'Quelle est la capitale de la France ?',
        options: ['Lyon', 'Marseille', 'Paris', 'Toulouse'],
        correctAnswer: 2,
        explanation: 'Paris est la capitale de la France depuis le Moyen Âge.'
      },
      {
        question: 'Combien font 15 + 25 ?',
        options: ['35', '40', '45', '50'],
        correctAnswer: 1,
        explanation: '15 + 25 = 40'
      },
      {
        question: 'Quel est le plus grand océan du monde ?',
        options: ['Atlantique', 'Pacifique', 'Indien', 'Arctique'],
        correctAnswer: 1,
        explanation: 'L\'océan Pacifique est le plus grand océan du monde.'
      }
    ],
    difficile: [
      {
        question: 'Quelle est la formule chimique de l\'eau ?',
        options: ['H2O', 'CO2', 'NaCl', 'O2'],
        correctAnswer: 0,
        explanation: 'L\'eau a pour formule chimique H2O (2 atomes d\'hydrogène et 1 atome d\'oxygène).'
      },
      {
        question: 'Qui a peint la Joconde ?',
        options: ['Michel-Ange', 'Léonard de Vinci', 'Picasso', 'Van Gogh'],
        correctAnswer: 1,
        explanation: 'Léonard de Vinci a peint la Joconde au XVIe siècle.'
      },
      {
        question: 'Quelle est la vitesse de la lumière ?',
        options: ['300 000 km/s', '150 000 km/s', '600 000 km/s', '900 000 km/s'],
        correctAnswer: 0,
        explanation: 'La vitesse de la lumière dans le vide est d\'environ 300 000 km/s.'
      }
    ]
  };

  const selectedQuestions = questionSets[difficulty] || questionSets.moyen;
  return selectedQuestions.slice(0, count);
}
