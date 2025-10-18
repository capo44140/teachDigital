/**
 * Wrapper pour bcryptjs avec gestion d'erreurs améliorée
 * Résout les problèmes d'initialisation dans l'environnement de bundling
 */

let bcrypt = null;

/**
 * Initialise bcryptjs de manière sécurisée
 */
async function initializeBcrypt() {
  if (bcrypt) {
    return bcrypt;
  }

  try {
    // Import dynamique pour éviter les problèmes de bundling
    const bcryptModule = await import('bcryptjs');
    bcrypt = bcryptModule.default || bcryptModule;
    
    // Vérifier que bcrypt est correctement initialisé
    if (!bcrypt || typeof bcrypt.hash !== 'function') {
      throw new Error('bcryptjs n\'est pas correctement initialisé');
    }
    
    console.log('✅ bcryptjs initialisé avec succès');
    return bcrypt;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de bcryptjs:', error);
    throw new Error('Impossible d\'initialiser bcryptjs');
  }
}

/**
 * Wrapper pour bcrypt.hash avec gestion d'erreurs
 */
export async function hashPin(pin, saltRounds = 12) {
  try {
    const bcryptInstance = await initializeBcrypt();
    
    if (!pin || typeof pin !== 'string') {
      throw new Error('Le code PIN doit être une chaîne de caractères valide');
    }
    
    if (pin.length < 4 || pin.length > 8) {
      throw new Error('Le code PIN doit contenir entre 4 et 8 caractères');
    }
    
    const hashedPin = await bcryptInstance.hash(pin, saltRounds);
    console.log('✅ Code PIN haché avec succès');
    return hashedPin;
  } catch (error) {
    console.error('❌ Erreur lors du hachage du code PIN:', error);
    throw new Error('Impossible de hacher le code PIN: ' + error.message);
  }
}

/**
 * Wrapper pour bcrypt.compare avec gestion d'erreurs
 */
export async function verifyPin(pin, hashedPin) {
  try {
    const bcryptInstance = await initializeBcrypt();
    
    if (!pin || !hashedPin) {
      console.log('❌ Code PIN ou hachage manquant');
      return false;
    }
    
    const isValid = await bcryptInstance.compare(pin, hashedPin);
    console.log(isValid ? '✅ Code PIN valide' : '❌ Code PIN invalide');
    return isValid;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du code PIN:', error);
    return false;
  }
}

/**
 * Test de fonctionnement de bcryptjs
 */
export async function testBcrypt() {
  try {
    const testPin = '1234';
    const hashedPin = await hashPin(testPin);
    const isValid = await verifyPin(testPin, hashedPin);
    
    return {
      success: true,
      message: 'bcryptjs fonctionne correctement',
      test: {
        original: testPin,
        hashed: hashedPin,
        verified: isValid
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erreur lors du test de bcryptjs: ' + error.message,
      error: error
    };
  }
}

export default {
  hashPin,
  verifyPin,
  testBcrypt,
  initializeBcrypt
};
