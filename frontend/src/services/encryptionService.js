/**
 * Service de chiffrement pour les données sensibles
 * Utilise Web Crypto API pour le chiffrement côté client
 */

class EncryptionService {
  constructor () {
    this.algorithm = 'AES-GCM'
    this.keyLength = 256
    this.ivLength = 12 // 96 bits pour GCM
    this.tagLength = 16 // 128 bits pour GCM
  }

  /**
   * Génère une clé de chiffrement
   * @returns {Promise<CryptoKey>} Clé de chiffrement
   */
  async generateKey () {
    return await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Importe une clé depuis un format binaire
   * @param {ArrayBuffer} keyData - Données de la clé
   * @returns {Promise<CryptoKey>} Clé importée
   */
  async importKey (keyData) {
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.algorithm },
      false, // non-extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Exporte une clé vers un format binaire
   * @param {CryptoKey} key - Clé à exporter
   * @returns {Promise<ArrayBuffer>} Données de la clé
   */
  async exportKey (key) {
    return await crypto.subtle.exportKey('raw', key)
  }

  /**
   * Chiffre des données sensibles
   * @param {string} data - Données à chiffrer
   * @param {CryptoKey} key - Clé de chiffrement
   * @returns {Promise<string>} Données chiffrées en base64
   */
  async encrypt (data, key) {
    try {
      // Générer un IV aléatoire
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength))

      // Convertir les données en ArrayBuffer
      const dataBuffer = new TextEncoder().encode(data)

      // Chiffrer les données
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv,
          tagLength: this.tagLength * 8
        },
        key,
        dataBuffer
      )

      // Combiner IV + données chiffrées
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encryptedBuffer), iv.length)

      // Convertir en base64
      return this.arrayBufferToBase64(combined)
    } catch (error) {
      console.error('Erreur lors du chiffrement:', error)
      throw new Error('Échec du chiffrement des données')
    }
  }

  /**
   * Déchiffre des données sensibles
   * @param {string} encryptedData - Données chiffrées en base64
   * @param {CryptoKey} key - Clé de déchiffrement
   * @returns {Promise<string>} Données déchiffrées
   */
  async decrypt (encryptedData, key) {
    try {
      // Convertir depuis base64
      const combined = this.base64ToArrayBuffer(encryptedData)

      // Extraire IV et données chiffrées
      const iv = combined.slice(0, this.ivLength)
      const encrypted = combined.slice(this.ivLength)

      // Déchiffrer les données
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv,
          tagLength: this.tagLength * 8
        },
        key,
        encrypted
      )

      // Convertir en string
      return new TextDecoder().decode(decryptedBuffer)
    } catch (error) {
      console.error('Erreur lors du déchiffrement:', error)
      throw new Error('Échec du déchiffrement des données')
    }
  }

  /**
   * Chiffre des données avec une clé dérivée d'un mot de passe
   * @param {string} data - Données à chiffrer
   * @param {string} password - Mot de passe
   * @param {Uint8Array} salt - Sel pour le dérivation
   * @returns {Promise<string>} Données chiffrées
   */
  async encryptWithPassword (data, password, salt = null) {
    try {
      // Générer un sel si non fourni
      if (!salt) {
        salt = crypto.getRandomValues(new Uint8Array(16))
      }

      // Dériver une clé depuis le mot de passe
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      )

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.algorithm, length: this.keyLength },
        false,
        ['encrypt', 'decrypt']
      )

      // Chiffrer les données
      const encrypted = await this.encrypt(data, key)

      // Combiner sel + données chiffrées
      const combined = new Uint8Array(salt.length + encrypted.length)
      combined.set(salt)
      combined.set(new TextEncoder().encode(encrypted), salt.length)

      return this.arrayBufferToBase64(combined)
    } catch (error) {
      console.error('Erreur lors du chiffrement avec mot de passe:', error)
      throw new Error('Échec du chiffrement avec mot de passe')
    }
  }

  /**
   * Déchiffre des données avec une clé dérivée d'un mot de passe
   * @param {string} encryptedData - Données chiffrées
   * @param {string} password - Mot de passe
   * @returns {Promise<string>} Données déchiffrées
   */
  async decryptWithPassword (encryptedData, password) {
    try {
      // Convertir depuis base64
      const combined = this.base64ToArrayBuffer(encryptedData)

      // Extraire sel et données chiffrées
      const salt = combined.slice(0, 16)
      const encrypted = new TextDecoder().decode(combined.slice(16))

      // Dériver la clé
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      )

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.algorithm, length: this.keyLength },
        false,
        ['encrypt', 'decrypt']
      )

      // Déchiffrer les données
      return await this.decrypt(encrypted, key)
    } catch (error) {
      console.error('Erreur lors du déchiffrement avec mot de passe:', error)
      throw new Error('Échec du déchiffrement avec mot de passe')
    }
  }

  /**
   * Chiffre des données de profil sensibles
   * @param {Object} profileData - Données du profil
   * @param {string} masterPassword - Mot de passe maître
   * @returns {Promise<Object>} Données chiffrées
   */
  async encryptProfileData (profileData, masterPassword) {
    const sensitiveFields = ['description', 'image_data', 'avatar_content']
    const encryptedData = { ...profileData }

    for (const field of sensitiveFields) {
      if (profileData[field]) {
        try {
          encryptedData[field] = await this.encryptWithPassword(
            profileData[field],
            masterPassword
          )
        } catch (error) {
          console.error(`Erreur lors du chiffrement du champ ${field}:`, error)
          // Garder la valeur originale en cas d'erreur
        }
      }
    }

    return encryptedData
  }

  /**
   * Déchiffre des données de profil sensibles
   * @param {Object} encryptedData - Données chiffrées
   * @param {string} masterPassword - Mot de passe maître
   * @returns {Promise<Object>} Données déchiffrées
   */
  async decryptProfileData (encryptedData, masterPassword) {
    const sensitiveFields = ['description', 'image_data', 'avatar_content']
    const decryptedData = { ...encryptedData }

    for (const field of sensitiveFields) {
      if (encryptedData[field]) {
        try {
          decryptedData[field] = await this.decryptWithPassword(
            encryptedData[field],
            masterPassword
          )
        } catch (error) {
          console.error(`Erreur lors du déchiffrement du champ ${field}:`, error)
          // Garder la valeur chiffrée en cas d'erreur
        }
      }
    }

    return decryptedData
  }

  /**
   * Génère un hash sécurisé pour les données
   * @param {string} data - Données à hasher
   * @returns {Promise<string>} Hash en base64
   */
  async generateHash (data) {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    return this.arrayBufferToBase64(hashBuffer)
  }

  /**
   * Vérifie l'intégrité des données
   * @param {string} data - Données originales
   * @param {string} hash - Hash de référence
   * @returns {Promise<boolean>} True si l'intégrité est vérifiée
   */
  async verifyIntegrity (data, hash) {
    try {
      const computedHash = await this.generateHash(data)
      return computedHash === hash
    } catch (error) {
      console.error('Erreur lors de la vérification d\'intégrité:', error)
      return false
    }
  }

  /**
   * Convertit un ArrayBuffer en base64
   * @param {ArrayBuffer} buffer - Buffer à convertir
   * @returns {string} String base64
   */
  arrayBufferToBase64 (buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convertit une string base64 en ArrayBuffer
   * @param {string} base64 - String base64
   * @returns {ArrayBuffer} Buffer
   */
  base64ToArrayBuffer (base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Génère un token sécurisé
   * @param {number} length - Longueur du token
   * @returns {string} Token sécurisé
   */
  generateSecureToken (length = 32) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return this.arrayBufferToBase64(array)
  }
}

export { EncryptionService }
