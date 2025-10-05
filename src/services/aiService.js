/**
 * Service d'IA pour la génération d'interrogations
 * Utilise des APIs d'IA pour analyser les images et générer des quiz
 */

class AIService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    this.baseUrl = 'https://api.openai.com/v1'
  }

  /**
   * Génère un quiz à partir d'une image de leçon
   * @param {File} imageFile - Fichier image de la leçon
   * @param {Object} childProfile - Profil de l'enfant
   * @returns {Promise<Object>} Quiz généré
   */
  async generateQuizFromImage(imageFile, childProfile) {
    try {
      // Convertir l'image en base64
      const base64Image = await this.fileToBase64(imageFile)
      
      // Analyser l'image avec l'IA
      const analysis = await this.analyzeImage(base64Image)
      
      // Générer le quiz basé sur l'analyse
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
    if (!this.apiKey) {
      // Mode démo - retourner une analyse simulée
      return this.getDemoAnalysis()
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
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
        throw new Error(`Erreur API: ${response.status}`)
      }

      const data = await response.json()
      return JSON.parse(data.choices[0].message.content)
    } catch (error) {
      console.error('Erreur lors de l\'analyse de l\'image:', error)
      return this.getDemoAnalysis()
    }
  }

  /**
   * Génère un quiz basé sur l'analyse
   * @param {Object} analysis - Analyse de l'image
   * @param {Object} childProfile - Profil de l'enfant
   * @returns {Promise<Object>} Quiz généré
   */
  async generateQuizFromAnalysis(analysis, childProfile) {
    if (!this.apiKey) {
      // Mode démo - retourner un quiz simulé
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
          model: 'gpt-4',
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
        throw new Error(`Erreur API: ${response.status}`)
      }

      const data = await response.json()
      return JSON.parse(data.choices[0].message.content)
    } catch (error) {
      console.error('Erreur lors de la génération du quiz:', error)
      return this.getDemoQuiz(childProfile)
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
    if (!this.apiKey) {
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
          model: 'gpt-4',
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
        throw new Error(`Erreur API: ${response.status}`)
      }

      const data = await response.json()
      return JSON.parse(data.choices[0].message.content)
    } catch (error) {
      console.error('Erreur lors de la génération du quiz:', error)
      return this.getDemoQuiz(childProfile)
    }
  }
}

export { AIService }
