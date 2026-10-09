#!/usr/bin/env node

/**
 * Script de test pour vérifier la sécurité des codes PIN
 * Teste le hachage, la vérification et la validation
 */

import { HashService } from '../src/services/hashService.js';
import { PinService } from '../src/services/profileService.js';

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

function logTest(testName) {
  log(`\n${colors.bold}🧪 Test: ${testName}${colors.reset}`);
  log('─'.repeat(50));
}

function logResult(success, message) {
  const icon = success ? '✅' : '❌';
  const color = success ? 'green' : 'red';
  log(`${icon} ${message}`, color);
}

async function testPinValidation() {
  logTest('Validation des codes PIN');
  
  const testCases = [
    { pin: '1234', shouldPass: false, reason: 'Code PIN trop simple' },
    { pin: '0000', shouldPass: false, reason: 'Code PIN trop simple' },
    { pin: '1111', shouldPass: false, reason: 'Code PIN trop simple' },
    { pin: '123', shouldPass: false, reason: 'Trop court' },
    { pin: '123456789', shouldPass: false, reason: 'Trop long' },
    { pin: 'abcd', shouldPass: false, reason: 'Contient des lettres' },
    { pin: '1234a', shouldPass: false, reason: 'Contient des lettres' },
    { pin: '12345', shouldPass: true, reason: 'Code PIN valide' },
    { pin: '9876', shouldPass: true, reason: 'Code PIN valide' },
    { pin: '1357', shouldPass: true, reason: 'Code PIN valide' }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    const validation = HashService.validatePinFormat(testCase.pin);
    const success = validation.isValid === testCase.shouldPass;
    
    if (success) {
      passed++;
      logResult(true, `${testCase.pin} - ${testCase.reason}`);
    } else {
      logResult(false, `${testCase.pin} - ${testCase.reason} (attendu: ${testCase.shouldPass}, obtenu: ${validation.isValid})`);
    }
  }
  
  log(`\nRésultat: ${passed}/${total} tests passés`, passed === total ? 'green' : 'red');
  return passed === total;
}

async function testPinHashing() {
  logTest('Hachage des codes PIN');
  
  const testPins = ['1234', '5678', '9999', '1357'];
  let passed = 0;
  let total = testPins.length;
  
  for (const pin of testPins) {
    try {
      const startTime = performance.now();
      const hashedPin = await HashService.hashPin(pin);
      const endTime = performance.now();
      
      // Vérifier que le hachage est différent du PIN original
      const isDifferent = hashedPin !== pin;
      // Vérifier que le hachage commence par $2a$ ou $2b$
      const isHashed = hashedPin.startsWith('$2a$') || hashedPin.startsWith('$2b$');
      // Vérifier que le hachage a une longueur raisonnable
      const isReasonableLength = hashedPin.length > 50 && hashedPin.length < 100;
      
      const success = isDifferent && isHashed && isReasonableLength;
      
      if (success) {
        passed++;
        logResult(true, `${pin} → haché en ${Math.round(endTime - startTime)}ms`);
      } else {
        logResult(false, `${pin} → échec du hachage`);
      }
    } catch (error) {
      logResult(false, `${pin} → erreur: ${error.message}`);
    }
  }
  
  log(`\nRésultat: ${passed}/${total} tests passés`, passed === total ? 'green' : 'red');
  return passed === total;
}

async function testPinVerification() {
  logTest('Vérification des codes PIN');
  
  const testCases = [
    { original: '1234', test: '1234', shouldMatch: true },
    { original: '1234', test: '5678', shouldMatch: false },
    { original: '9999', test: '9999', shouldMatch: true },
    { original: '1357', test: '1358', shouldMatch: false }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    try {
      const hashedPin = await HashService.hashPin(testCase.original);
      const isValid = await HashService.verifyPin(testCase.test, hashedPin);
      const success = isValid === testCase.shouldMatch;
      
      if (success) {
        passed++;
        logResult(true, `${testCase.original} vs ${testCase.test} → ${isValid ? 'correspond' : 'ne correspond pas'}`);
      } else {
        logResult(false, `${testCase.original} vs ${testCase.test} → attendu: ${testCase.shouldMatch}, obtenu: ${isValid}`);
      }
    } catch (error) {
      logResult(false, `${testCase.original} vs ${testCase.test} → erreur: ${error.message}`);
    }
  }
  
  log(`\nRésultat: ${passed}/${total} tests passés`, passed === total ? 'green' : 'red');
  return passed === total;
}

async function testPinStrength() {
  logTest('Analyse de la force des codes PIN');
  
  const testCases = [
    { pin: '1234', expectedStrength: 'weak' },
    { pin: '1111', expectedStrength: 'weak' },
    { pin: '12345', expectedStrength: 'medium' },
    { pin: '13579', expectedStrength: 'medium' },
    { pin: '135792', expectedStrength: 'strong' },
    { pin: '246813', expectedStrength: 'strong' }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    const strength = HashService.getPinStrength(testCase.pin);
    const success = strength.strength === testCase.expectedStrength;
    
    if (success) {
      passed++;
      logResult(true, `${testCase.pin} → ${strength.strength} (${strength.message})`);
    } else {
      logResult(false, `${testCase.pin} → attendu: ${testCase.expectedStrength}, obtenu: ${strength.strength}`);
    }
  }
  
  log(`\nRésultat: ${passed}/${total} tests passés`, passed === total ? 'green' : 'red');
  return passed === total;
}

async function testSecurePinGeneration() {
  logTest('Génération de codes PIN sécurisés');
  
  const lengths = [4, 6, 8];
  let passed = 0;
  let total = lengths.length;
  
  for (const length of lengths) {
    try {
      const pin = HashService.generateSecurePin(length);
      const validation = HashService.validatePinFormat(pin);
      const strength = HashService.getPinStrength(pin);
      
      const success = validation.isValid && pin.length === length && strength.strength !== 'weak';
      
      if (success) {
        passed++;
        logResult(true, `PIN ${length} chiffres: ${pin} (${strength.strength})`);
      } else {
        logResult(false, `PIN ${length} chiffres: ${pin} → validation: ${validation.isValid}, force: ${strength.strength}`);
      }
    } catch (error) {
      logResult(false, `PIN ${length} chiffres → erreur: ${error.message}`);
    }
  }
  
  log(`\nRésultat: ${passed}/${total} tests passés`, passed === total ? 'green' : 'red');
  return passed === total;
}

async function testPinServiceIntegration() {
  logTest('Intégration avec PinService');
  
  try {
    // Test de validation
    const validation = PinService.validatePin('1234');
    const validationSuccess = !validation.isValid; // 1234 devrait être invalide
    
    // Test de génération
    const generatedPin = PinService.generateSecurePin(4);
    const generationSuccess = generatedPin && generatedPin.length === 4;
    
    // Test d'analyse
    const strength = PinService.analyzePinStrength('12345');
    const analysisSuccess = strength && strength.strength;
    
    const totalTests = 3;
    const passedTests = [validationSuccess, generationSuccess, analysisSuccess].filter(Boolean).length;
    
    logResult(validationSuccess, 'Validation PinService');
    logResult(generationSuccess, 'Génération PinService');
    logResult(analysisSuccess, 'Analyse PinService');
    
    log(`\nRésultat: ${passedTests}/${totalTests} tests passés`, passedTests === totalTests ? 'green' : 'red');
    return passedTests === totalTests;
  } catch (error) {
    logResult(false, `Erreur d'intégration: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log(`${colors.bold}🚀 Démarrage des tests de sécurité des codes PIN${colors.reset}`);
  log('='.repeat(60));
  
  const tests = [
    { name: 'Validation des codes PIN', fn: testPinValidation },
    { name: 'Hachage des codes PIN', fn: testPinHashing },
    { name: 'Vérification des codes PIN', fn: testPinVerification },
    { name: 'Analyse de la force', fn: testPinStrength },
    { name: 'Génération sécurisée', fn: testSecurePinGeneration },
    { name: 'Intégration PinService', fn: testPinServiceIntegration }
  ];
  
  let totalPassed = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      if (passed) totalPassed++;
    } catch (error) {
      logResult(false, `Erreur dans ${test.name}: ${error.message}`);
    }
  }
  
  log('\n' + '='.repeat(60));
  log(`${colors.bold}📊 Résumé des tests${colors.reset}`);
  log(`Tests passés: ${totalPassed}/${totalTests}`, totalPassed === totalTests ? 'green' : 'red');
  
  if (totalPassed === totalTests) {
    log('\n🎉 Tous les tests sont passés ! La sécurité des codes PIN est opérationnelle.', 'green');
  } else {
    log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.', 'yellow');
  }
  
  return totalPassed === totalTests;
}

// Exécuter les tests
runAllTests().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
