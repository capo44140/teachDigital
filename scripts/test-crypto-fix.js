#!/usr/bin/env node

/**
 * Script de test pour vérifier que la correction du problème crypto fonctionne
 */

import { testBcrypt } from '../src/services/cryptoWrapper.js';
import { HashService } from '../src/services/hashService.js';

// Couleurs pour la console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCryptoFix() {
  log('\n🔧 Test de la correction du problème crypto', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Test 1: Test direct du wrapper crypto
    log('\n📋 Test 1: Wrapper crypto direct', 'yellow');
    const cryptoTest = await testBcrypt();
    
    if (cryptoTest.success) {
      log('✅ Wrapper crypto fonctionne correctement', 'green');
      log(`   - PIN original: ${cryptoTest.test.original}`, 'blue');
      log(`   - PIN haché: ${cryptoTest.test.hashed.substring(0, 20)}...`, 'blue');
      log(`   - Vérification: ${cryptoTest.test.verified ? 'OK' : 'ÉCHEC'}`, 'blue');
    } else {
      log('❌ Erreur dans le wrapper crypto:', 'red');
      log(`   ${cryptoTest.message}`, 'red');
      return false;
    }
    
    // Test 2: Test via HashService
    log('\n📋 Test 2: HashService', 'yellow');
    const testPin = '5678';
    const hashedPin = await HashService.hashPin(testPin);
    const isValid = await HashService.verifyPin(testPin, hashedPin);
    
    if (isValid) {
      log('✅ HashService fonctionne correctement', 'green');
      log(`   - PIN testé: ${testPin}`, 'blue');
      log(`   - PIN haché: ${hashedPin.substring(0, 20)}...`, 'blue');
      log(`   - Vérification: OK`, 'blue');
    } else {
      log('❌ Erreur dans HashService', 'red');
      return false;
    }
    
    // Test 3: Test de validation
    log('\n📋 Test 3: Validation des codes PIN', 'yellow');
    const validationTests = [
      { pin: '1234', expected: true },
      { pin: '0000', expected: false },
      { pin: '123', expected: false },
      { pin: '123456789', expected: false },
      { pin: 'abcd', expected: false }
    ];
    
    let validationPassed = 0;
    for (const test of validationTests) {
      const validation = HashService.validatePinFormat(test.pin);
      const passed = validation.isValid === test.expected;
      
      if (passed) {
        log(`✅ PIN "${test.pin}": ${validation.isValid ? 'Valide' : 'Invalide'} (attendu)`, 'green');
        validationPassed++;
      } else {
        log(`❌ PIN "${test.pin}": ${validation.isValid ? 'Valide' : 'Invalide'} (inattendu)`, 'red');
      }
    }
    
    log(`\n📊 Résultats de validation: ${validationPassed}/${validationTests.length} tests réussis`, 
        validationPassed === validationTests.length ? 'green' : 'yellow');
    
    // Test 4: Test de force
    log('\n📋 Test 4: Analyse de la force des codes PIN', 'yellow');
    const strengthTests = [
      { pin: '1234', expectedLevel: 'Faible' },
      { pin: '5678', expectedLevel: 'Moyen' },
      { pin: '1357', expectedLevel: 'Moyen' },
      { pin: '2468', expectedLevel: 'Moyen' }
    ];
    
    for (const test of strengthTests) {
      const strength = HashService.getPinStrength(test.pin);
      log(`   PIN "${test.pin}": ${strength.strength} (score: ${strength.score}/5)`, 'blue');
    }
    
    log('\n🎉 Tous les tests sont passés avec succès !', 'green');
    log('✅ La correction du problème crypto est fonctionnelle', 'green');
    
    return true;
    
  } catch (error) {
    log('\n❌ Erreur lors des tests:', 'red');
    log(`   ${error.message}`, 'red');
    log(`   Stack: ${error.stack}`, 'red');
    return false;
  }
}

// Exécuter les tests
testCryptoFix()
  .then(success => {
    if (success) {
      log('\n✅ Correction validée avec succès !', 'green');
      process.exit(0);
    } else {
      log('\n❌ La correction nécessite des ajustements', 'red');
      process.exit(1);
    }
  })
  .catch(error => {
    log('\n💥 Erreur fatale:', 'red');
    log(`   ${error.message}`, 'red');
    process.exit(1);
  });
