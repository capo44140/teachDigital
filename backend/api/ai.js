const { sql } = require('../lib/database.js');
const { authenticateToken } = require('../lib/auth.js');
const { setCorsHeaders, handleCors } = require('../lib/cors.js');
const { createResponse, createErrorResponse } = require('../lib/response.js');

// URLs des APIs
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

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
 * Génère un quiz à partir de plusieurs documents
 */
async function handleGenerateQuizFromDocuments(req, res) {
  try {
    console.log('🔍 Début de handleGenerateQuizFromDocuments');
    
    // Parser le body de manière sécurisée
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

    console.log('📊 Body parsé:', {
      hasDocuments: !!body.documents,
      documentsCount: body.documents?.length || 0,
      hasChildProfile: !!body.childProfile,
      questionCount: body.questionCount
    });

    const { documents, childProfile, questionCount } = body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
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
          const imageData = doc.data || doc.base64;
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
    const quiz = await generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount || 5);

    console.log('✅ Quiz généré avec succès');
    return res.status(200).json(createResponse('Quiz généré avec succès', { quiz }));
  } catch (error) {
    console.error('❌ Erreur lors de la génération du quiz depuis documents:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      name: error.name
    });
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
 * Analyse une image avec l'IA
 */
async function analyzeImage(base64Image) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  // Essayer d'abord OpenAI
  if (isValidOpenAIKey(openaiApiKey)) {
    try {
      return await analyzeImageWithOpenAI(base64Image);
    } catch (error) {
      console.warn('Erreur OpenAI, tentative avec Gemini:', error.message);
    }
  }

  // Essayer Gemini si OpenAI échoue
  if (isValidGeminiKey(geminiApiKey)) {
    try {
      return await analyzeImageWithGemini(base64Image);
    } catch (error) {
      console.warn('Erreur Gemini, tentative avec Groq:', error.message);
    }
  }

  // Essayer Groq si Gemini échoue
  if (isValidGroqKey(groqApiKey)) {
    try {
      return await analyzeImageWithGroq(base64Image);
    } catch (error) {
      console.warn('Erreur Groq:', error.message);
    }
  }

  // Fallback vers le mode démo
  return getDemoAnalysis();
}

/**
 * Analyse une image avec OpenAI
 */
async function analyzeImageWithOpenAI(base64Image) {
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
          content: [
            {
              type: 'text',
              text: 'Analysez cette image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur OpenAI: ${response.status}`);
  }

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
 * Analyse une image avec Gemini
 */
async function analyzeImageWithGemini(base64Image, retryCount = 0) {
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
          parts: [
            {
              text: 'Analysez cette image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}'
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
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
        return analyzeImageWithGemini(base64Image, retryCount + 1);
      }
      throw new Error('Impossible de parser la réponse de Gemini');
    }
  } catch (error) {
    if (retryCount < maxRetries && error.message.includes('tronquée')) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Délai réduit à 500ms
      return analyzeImageWithGemini(base64Image, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Analyse une image avec Groq
 */
async function analyzeImageWithGroq(base64Image) {
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
          content: [
            {
              type: 'text',
              text: 'Analysez cette image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
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
 * Génère un quiz basé sur l'analyse
 */
async function generateQuizFromAnalysis(analysis, childProfile) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  // Essayer d'abord OpenAI
  if (isValidOpenAIKey(openaiApiKey)) {
    try {
      return await generateQuizWithOpenAI(analysis, childProfile);
    } catch (error) {
      console.warn('Erreur OpenAI, tentative avec Gemini:', error.message);
    }
  }

  // Essayer Gemini si OpenAI échoue
  if (isValidGeminiKey(geminiApiKey)) {
    try {
      return await generateQuizWithGemini(analysis, childProfile);
    } catch (error) {
      console.warn('Erreur Gemini, tentative avec Groq:', error.message);
    }
  }

  // Essayer Groq si Gemini échoue
  if (isValidGroqKey(groqApiKey)) {
    try {
      return await generateQuizWithGroq(analysis, childProfile);
    } catch (error) {
      console.warn('Erreur Groq:', error.message);
    }
  }

  // Fallback vers le mode démo
  return getDemoQuiz(childProfile);
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

  if (!response.ok) {
    throw new Error(`Erreur OpenAI: ${response.status}`);
  }

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
 * Génère un quiz à partir de plusieurs analyses
 */
async function generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  // Essayer d'abord OpenAI
  if (isValidOpenAIKey(openaiApiKey)) {
    try {
      return await generateQuizFromMultipleAnalysesWithOpenAI(analyses, childProfile, questionCount);
    } catch (error) {
      console.warn('Erreur OpenAI, tentative avec Gemini:', error.message);
    }
  }

  // Essayer Gemini si OpenAI échoue
  if (isValidGeminiKey(geminiApiKey)) {
    try {
      return await generateQuizFromMultipleAnalysesWithGemini(analyses, childProfile, questionCount);
    } catch (error) {
      console.warn('Erreur Gemini, tentative avec Groq:', error.message);
    }
  }

  // Essayer Groq si Gemini échoue
  if (isValidGroqKey(groqApiKey)) {
    try {
      return await generateQuizFromMultipleAnalysesWithGroq(analyses, childProfile, questionCount);
    } catch (error) {
      console.warn('Erreur Groq:', error.message);
    }
  }

  // Fallback vers le mode démo
  return getDemoQuizFromDocuments(childProfile, questionCount);
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

  if (!response.ok) {
    throw new Error(`Erreur OpenAI: ${response.status}`);
  }

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

  // Essayer d'abord OpenAI
  if (isValidOpenAIKey(openaiApiKey)) {
    try {
      return await generateQuizFromTextWithOpenAI(inputText, childProfile, options);
    } catch (error) {
      console.warn('Erreur OpenAI, tentative avec Gemini:', error.message);
    }
  }

  // Essayer Gemini si OpenAI échoue
  if (isValidGeminiKey(geminiApiKey)) {
    try {
      return await generateQuizFromTextWithGemini(inputText, childProfile, options);
    } catch (error) {
      console.warn('Erreur Gemini, tentative avec Groq:', error.message);
    }
  }

  // Essayer Groq si Gemini échoue
  if (isValidGroqKey(groqApiKey)) {
    try {
      return await generateQuizFromTextWithGroq(inputText, childProfile, options);
    } catch (error) {
      console.warn('Erreur Groq:', error.message);
    }
  }

  // Fallback vers le mode démo
  return getDemoQuizFromText(childProfile, options);
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

  if (!response.ok) {
    throw new Error(`Erreur OpenAI: ${response.status}`);
  }

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
 * Génère un quiz à partir d'un texte avec Groq
 */
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
    case 'groq':
      apiKey = process.env.GROQ_API_KEY;
      return isValidGroqKey(apiKey);
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
  const groqValid = await validateApiKey('groq');
  
  return openaiValid || geminiValid || groqValid;
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
