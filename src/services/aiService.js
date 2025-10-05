/**
 * Service d'IA pour la génération d'interrogations
 * Utilise des APIs d'IA pour analyser les images et générer des quiz
 */

class AIService {
  constructor() {
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
    this.groqApiKey = import.meta.env.VITE_GROQ_API_KEY || ''
    this.openaiBaseUrl = 'https://api.openai.com/v1'
    this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta'
    this.groqBaseUrl = 'https://api.groq.com/openai/v1'
  }

  /**
   * Vérifie si une clé API OpenAI est valide
   * @returns {boolean} True si la clé API OpenAI est valide
   */
  isValidOpenAIKey() {
    return this.openaiApiKey && 
           this.openaiApiKey !== 'sk-your-openai-api-key-here' && 
           this.openaiApiKey.startsWith('sk-') && 
           this.openaiApiKey.length > 20
  }

  /**
   * Vérifie si une clé API Gemini est valide
   * @returns {boolean} True si la clé API Gemini est valide
   */
  isValidGeminiKey() {
    return this.geminiApiKey && 
           this.geminiApiKey !== 'your-gemini-api-key-here' && 
           this.geminiApiKey.length > 20
  }

  /**
   * Vérifie si une clé API Groq est valide
   * @returns {boolean} True si la clé API Groq est valide
   */
  isValidGroqKey() {
    return this.groqApiKey && 
           this.groqApiKey !== 'your-groq-api-key-here' && 
           this.groqApiKey.length > 20
  }

  /**
   * Vérifie si au moins une clé API est valide
   * @returns {boolean} True si au moins une clé API est valide
   */
  hasValidApiKey() {
    return this.isValidOpenAIKey() || this.isValidGeminiKey() || this.isValidGroqKey()
  }

  /**
   * Génère un quiz à partir d'une image de leçon
   * @param {File} imageFile - Fichier image de la leçon
   * @param {Object} childProfile - Profil de l'enfant
   * @returns {Promise<Object>} Quiz généré
   */
  async generateQuizFromImage(imageFile, childProfile) {
    try {
      const base64Image = await this.fileToBase64(imageFile)
      const analysis = await this.analyzeImage(base64Image)
      const quiz = await this.generateQuizFromAnalysis(analysis, childProfile)
      return quiz
    } catch (error) {
      console.error('Erreur lors de la génération du quiz:', error)
      throw new Error('Impossible de générer le quiz. Veuillez réessayer.')
    }
  }

  /**
   * Convertit un fichier en base64
   * @param {File} file - Fichier à convertir
   * @returns {Promise<string>} Base64 du fichier
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = error => reject(error)
    })
  }

  /**
   * Analyse une image avec l'IA
   * @param {string} base64Image - Image en base64
   * @returns {Promise<Object>} Analyse de l'image
   */
  async analyzeImage(base64Image) {
    if (!this.hasValidApiKey()) {
      return this.getDemoAnalysis()
    }

    // Essayer d'abord OpenAI
    if (this.isValidOpenAIKey()) {
      try {
        const result = await this.analyzeImageWithOpenAI(base64Image)
        return result
      } catch (error) {
        console.warn('Erreur OpenAI, tentative avec Gemini:', error.message)
      }
    }

    // Essayer Gemini si OpenAI échoue
    if (this.isValidGeminiKey()) {
      try {
        const result = await this.analyzeImageWithGemini(base64Image)
        return result
      } catch (error) {
        console.warn('Erreur Gemini, tentative avec Groq:', error.message)
      }
    }

    // Essayer Groq si Gemini échoue
    if (this.isValidGroqKey()) {
      try {
        const result = await this.analyzeImageWithGroq(base64Image)
        return result
      } catch (error) {
        console.warn('Erreur Groq:', error.message)
      }
    }

    // Fallback vers le mode démo
    return this.getDemoAnalysis()
  }

  async analyzeImageWithOpenAI(base64Image) {
    const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analysez cette image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français.'
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
    })

    if (!response.ok) {
      throw new Error(`Erreur OpenAI: ${response.status}`)
    }

    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  }

  async analyzeImageWithGemini(base64Image, retryCount = 0) {
    const maxRetries = 2
    
    try {
      const response = await fetch(`${this.geminiBaseUrl}/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: 'Analysez cette image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format attendu: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}'
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
            maxOutputTokens: 2000, // Augmenté de 1000 à 2000
            temperature: 0.7,
            topP: 0.8,
            topK: 40
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Erreur Gemini: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      
      // Vérifier si la réponse est complète
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Réponse Gemini incomplète')
      }
      
      const text = data.candidates[0].content.parts[0].text
      
      // Vérifier si la réponse est tronquée (se termine par des caractères incomplets)
      if (text.length > 0 && !text.trim().endsWith('}') && !text.trim().endsWith(']')) {
        console.warn('Réponse Gemini potentiellement tronquée, tentative de retry...')
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Délai progressif
          return this.analyzeImageWithGemini(base64Image, retryCount + 1)
        }
      }
      
      // Nettoyer le texte pour extraire le JSON
      let jsonText = text.trim()
      
      // Supprimer les backticks et markdown si présents
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Essayer de trouver le JSON dans le texte
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }
      
      // Vérifier si le JSON semble complet
      if (!jsonText.endsWith('}')) {
        console.warn('JSON incomplet détecté, tentative de retry...')
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return this.analyzeImageWithGemini(base64Image, retryCount + 1)
        }
      }
      
      try {
        const parsed = JSON.parse(jsonText)
        
        // Vérifier que l'objet a les propriétés attendues
        if (!parsed.titre_principal && !parsed.concepts_cles) {
          throw new Error('Structure JSON invalide')
        }
        
        return parsed
      } catch (parseError) {
        console.error('Erreur de parsing JSON Gemini:', parseError)
        console.error('Texte reçu:', text)
        console.error('JSON nettoyé:', jsonText)
        
        // Tentative de retry si c'est un problème de parsing
        if (retryCount < maxRetries) {
          console.log(`Tentative de retry ${retryCount + 1}/${maxRetries}...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return this.analyzeImageWithGemini(base64Image, retryCount + 1)
        }
        
        throw new Error('Impossible de parser la réponse de Gemini après plusieurs tentatives')
      }
    } catch (error) {
      if (retryCount < maxRetries && error.message.includes('tronquée')) {
        console.log(`Erreur réseau, tentative de retry ${retryCount + 1}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return this.analyzeImageWithGemini(base64Image, retryCount + 1)
      }
      throw error
    }
  }

  async analyzeImageWithGroq(base64Image) {
    const response = await fetch(`${this.groqBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
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
    })

    if (!response.ok) {
      throw new Error(`Erreur Groq: ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices[0].message.content
    
    // Nettoyer le texte pour extraire le JSON
    let jsonText = text.trim()
    
    // Supprimer les backticks et markdown si présents
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Essayer de trouver le JSON dans le texte
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    try {
      return JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Erreur de parsing JSON Groq:', parseError)
      console.error('Texte reçu:', text)
      throw new Error('Impossible de parser la réponse de Groq')
    }
  }

  /**
   * Génère un quiz basé sur l'analyse
   * @param {Object} analysis - Analyse de l'image
   * @param {Object} childProfile - Profil de l'enfant
   * @returns {Promise<Object>} Quiz généré
   */
  async generateQuizFromAnalysis(analysis, childProfile) {
    if (!this.hasValidApiKey()) {
      return this.getDemoQuiz(childProfile)
    }

    // Essayer d'abord OpenAI
    if (this.isValidOpenAIKey()) {
      try {
        const result = await this.generateQuizWithOpenAI(analysis, childProfile)
        return result
      } catch (error) {
        console.warn('Erreur OpenAI, tentative avec Gemini:', error.message)
      }
    }

    // Essayer Gemini si OpenAI échoue
    if (this.isValidGeminiKey()) {
      try {
        const result = await this.generateQuizWithGemini(analysis, childProfile)
        return result
      } catch (error) {
        console.warn('Erreur Gemini, tentative avec Groq:', error.message)
      }
    }

    // Essayer Groq si Gemini échoue
    if (this.isValidGroqKey()) {
      try {
        const result = await this.generateQuizWithGroq(analysis, childProfile)
        return result
      } catch (error) {
        console.warn('Erreur Groq:', error.message)
      }
    }

    // Fallback vers le mode démo
    return this.getDemoQuiz(childProfile)
  }

  async generateQuizWithOpenAI(analysis, childProfile) {
    const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. 
            Créez des questions claires, éducatives et adaptées au niveau de l'enfant.
            L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.`
          },
          {
            role: 'user',
            content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, 
            générez un quiz de 5 questions avec 4 options chacune. 
            Format de réponse: JSON avec structure {title, description, questions: [{question, options: [], correctAnswer}]}`
          }
        ],
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      throw new Error(`Erreur OpenAI: ${response.status}`)
    }

    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  }

  async generateQuizWithGemini(analysis, childProfile, retryCount = 0) {
    const maxRetries = 2
    
    try {
      const response = await fetch(`${this.geminiBaseUrl}/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`, {
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
            maxOutputTokens: 3000, // Augmenté pour éviter les troncatures
            temperature: 0.7,
            topP: 0.8,
            topK: 40
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Erreur Gemini: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      
      // Vérifier si la réponse est complète
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Réponse Gemini incomplète')
      }
      
      const text = data.candidates[0].content.parts[0].text
      
      // Nettoyer le texte pour extraire le JSON
      let jsonText = text.trim()
      
      // Supprimer les backticks et markdown si présents
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Essayer de trouver le JSON dans le texte
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }
      
      // Vérifier si le JSON semble tronqué et essayer de le réparer
      if (!jsonText.endsWith('}')) {
        console.warn('JSON potentiellement tronqué détecté, tentative de réparation...')
        
        // Essayer de fermer le JSON de manière intelligente
        if (jsonText.includes('"questions"') && jsonText.includes('[')) {
          // Si on a commencé les questions, essayer de fermer proprement
          const lastCompleteQuestion = this.findLastCompleteQuestion(jsonText)
          if (lastCompleteQuestion) {
            jsonText = jsonText.substring(0, lastCompleteQuestion) + ']}'
          } else {
            // Si aucune question complète, fermer avec un tableau vide
            jsonText = jsonText.replace(/\[[\s\S]*$/, '[]]}')
          }
        } else {
          // Si on n'a pas encore commencé les questions, fermer avec un objet basique
          jsonText = jsonText.replace(/,\s*$/, '') + '}'
        }
      }
      
      try {
        const parsed = JSON.parse(jsonText)
        
        // Vérifier que l'objet a les propriétés attendues
        if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions)) {
          throw new Error('Structure JSON invalide pour le quiz')
        }
        
        // Vérifier que toutes les questions sont complètes
        const validQuestions = parsed.questions.filter(q => 
          q.question && 
          q.options && 
          Array.isArray(q.options) && 
          q.options.length === 4 && 
          typeof q.correctAnswer === 'number'
        )
        
        if (validQuestions.length === 0) {
          throw new Error('Aucune question valide trouvée')
        }
        
        // Si on a moins de 5 questions valides, essayer un retry
        if (validQuestions.length < 3 && retryCount < maxRetries) {
          console.log(`Seulement ${validQuestions.length} questions valides, tentative de retry...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return this.generateQuizWithGemini(analysis, childProfile, retryCount + 1)
        }
        
        // Retourner le quiz avec les questions valides
        return {
          ...parsed,
          questions: validQuestions
        }
        
      } catch (parseError) {
        console.error('Erreur de parsing JSON Gemini:', parseError)
        console.error('Texte reçu:', text)
        console.error('JSON nettoyé:', jsonText)
        
        // Tentative de retry si c'est un problème de parsing
        if (retryCount < maxRetries) {
          console.log(`Tentative de retry ${retryCount + 1}/${maxRetries}...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return this.generateQuizWithGemini(analysis, childProfile, retryCount + 1)
        }
        
        // Fallback vers le quiz démo si tout échoue
        console.warn('Fallback vers le quiz démo après échec de Gemini')
        return this.getDemoQuiz(childProfile)
      }
    } catch (error) {
      if (retryCount < maxRetries && (error.message.includes('tronquée') || error.message.includes('incomplet'))) {
        console.log(`Erreur réseau, tentative de retry ${retryCount + 1}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return this.generateQuizWithGemini(analysis, childProfile, retryCount + 1)
      }
      
      // Fallback vers le quiz démo en cas d'erreur
      console.warn('Fallback vers le quiz démo après erreur:', error.message)
      return this.getDemoQuiz(childProfile)
    }
  }

  /**
   * Trouve la dernière question complète dans un JSON tronqué
   * @param {string} jsonText - Texte JSON potentiellement tronqué
   * @returns {number} Position de la fin de la dernière question complète
   */
  findLastCompleteQuestion(jsonText) {
    const questionPattern = /"question":\s*"[^"]*",\s*"options":\s*\[[^\]]*\],\s*"correctAnswer":\s*\d+/
    const matches = [...jsonText.matchAll(questionPattern)]
    
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1]
      return lastMatch.index + lastMatch[0].length
    }
    
    return null
  }

  async generateQuizWithGroq(analysis, childProfile) {
    const response = await fetch(`${this.groqBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. 
            Créez des questions claires, éducatives et adaptées au niveau de l'enfant.
            L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.`
          },
          {
            role: 'user',
            content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, 
            générez un quiz de 5 questions avec 4 options chacune. 
            IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. 
            Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0}]}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`Erreur Groq: ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices[0].message.content
    
    // Nettoyer le texte pour extraire le JSON
    let jsonText = text.trim()
    
    // Supprimer les backticks et markdown si présents
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Essayer de trouver le JSON dans le texte
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    try {
      return JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Erreur de parsing JSON Groq:', parseError)
      console.error('Texte reçu:', text)
      throw new Error('Impossible de parser la réponse de Groq')
    }
  }

  /**
   * Analyse démo pour les tests
   * @returns {Object} Analyse simulée
   */
  getDemoAnalysis() {
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
    }
  }

  /**
   * Quiz démo pour les tests
   * @param {Object} childProfile - Profil de l'enfant
   * @returns {Object} Quiz simulé
   */
  getDemoQuiz(childProfile) {
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
    }
  }

  /**
   * Génère un quiz personnalisé basé sur un texte
   * @param {string} text - Texte de la leçon
   * @param {Object} childProfile - Profil de l'enfant
   * @returns {Promise<Object>} Quiz généré
   */
  async generateQuizFromText(text, childProfile) {
    if (!this.isValidApiKey()) {
      return this.getDemoQuiz(childProfile)
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5',
          messages: [
            {
              role: 'system',
              content: `Créez un quiz éducatif adapté à l'âge de l'enfant (${childProfile.age || 8} ans).
              Format de réponse: JSON avec {title, description, questions: [{question, options: [], correctAnswer, explanation}]}`
            },
            {
              role: 'user',
              content: `Créez un quiz de 5 questions basé sur ce texte: ${text}`
            }
          ],
          max_tokens: 1500
        })
      })

      if (!response.ok) {
        return this.getDemoQuiz(childProfile)
      }

      const data = await response.json()
      return JSON.parse(data.choices[0].message.content)
    } catch (error) {
      return this.getDemoQuiz(childProfile)
    }
  }
}

export { AIService }
