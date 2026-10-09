#!/usr/bin/env node

/**
 * 🧪 Script de test pour le système de notifications
 * 
 * Ce script teste toutes les fonctionnalités du système de notifications :
 * - Création de notifications
 * - Récupération des notifications
 * - Marquage comme lu/non lu
 * - Suppression de notifications
 * - Statistiques des notifications
 * - Notifications de quiz
 */

import { NotificationService } from '../src/services/notificationService.js';
import db from '../backend/lib/database.js'

const sql = db.sql || db.default

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Fonction de logging avec couleurs
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Fonction pour afficher les résultats de test
function logResult(success, message, details = '') {
  const status = success ? '✅' : '❌';
  const color = success ? 'green' : 'red';
  log(`${status} ${message}`, color);
  if (details) {
    log(`   ${details}`, 'yellow');
  }
}

// Test de connexion à la base de données
async function testDatabaseConnection() {
  try {
    await sql`SELECT 1 as ok`
    logResult(true, 'Connexion à la base de données');
    return true;
  } catch (error) {
    logResult(false, 'Connexion à la base de données', error.message);
    return false;
  }
}

// Test de création de notification
async function testCreateNotification() {
  try {
    const testProfileId = 1;
    const notification = await NotificationService.createNotification(
      testProfileId,
      'test',
      'Test de notification',
      'Ceci est un test de notification',
      { testData: 'test' }
    );
    
    if (notification && notification.id) {
      logResult(true, 'Création de notification', `ID: ${notification.id}`);
      return notification.id;
    } else {
      logResult(false, 'Création de notification', 'Aucun ID retourné');
      return null;
    }
  } catch (error) {
    logResult(false, 'Création de notification', error.message);
    return null;
  }
}

// Test de récupération des notifications
async function testGetNotifications() {
  try {
    const testProfileId = 1;
    const notifications = await NotificationService.getNotifications(testProfileId);
    
    if (Array.isArray(notifications)) {
      logResult(true, 'Récupération des notifications', `${notifications.length} notifications trouvées`);
      return notifications;
    } else {
      logResult(false, 'Récupération des notifications', 'Format de données invalide');
      return [];
    }
  } catch (error) {
    logResult(false, 'Récupération des notifications', error.message);
    return [];
  }
}

// Test de récupération des notifications non lues
async function testGetUnreadNotifications() {
  try {
    const testProfileId = 1;
    const unreadNotifications = await NotificationService.getNotifications(testProfileId, true);
    
    if (Array.isArray(unreadNotifications)) {
      logResult(true, 'Récupération des notifications non lues', `${unreadNotifications.length} notifications non lues`);
      return unreadNotifications;
    } else {
      logResult(false, 'Récupération des notifications non lues', 'Format de données invalide');
      return [];
    }
  } catch (error) {
    logResult(false, 'Récupération des notifications non lues', error.message);
    return [];
  }
}

// Test de marquage comme lu
async function testMarkAsRead(notificationId) {
  try {
    if (!notificationId) {
      logResult(false, 'Marquage comme lu', 'Aucun ID de notification fourni');
      return false;
    }
    
    const result = await NotificationService.markAsRead(notificationId);
    
    if (result && result.is_read === true) {
      logResult(true, 'Marquage comme lu', `Notification ${notificationId} marquée comme lue`);
      return true;
    } else {
      logResult(false, 'Marquage comme lu', 'La notification n\'a pas été marquée comme lue');
      return false;
    }
  } catch (error) {
    logResult(false, 'Marquage comme lu', error.message);
    return false;
  }
}

// Test de marquage de toutes les notifications comme lues
async function testMarkAllAsRead() {
  try {
    const testProfileId = 1;
    const count = await NotificationService.markAllAsRead(testProfileId);
    
    if (typeof count === 'number') {
      logResult(true, 'Marquage de toutes les notifications comme lues', `${count} notifications marquées`);
      return true;
    } else {
      logResult(false, 'Marquage de toutes les notifications comme lues', 'Format de retour invalide');
      return false;
    }
  } catch (error) {
    logResult(false, 'Marquage de toutes les notifications comme lues', error.message);
    return false;
  }
}

// Test de suppression de notification
async function testDeleteNotification(notificationId) {
  try {
    if (!notificationId) {
      logResult(false, 'Suppression de notification', 'Aucun ID de notification fourni');
      return false;
    }
    
    const result = await NotificationService.deleteNotification(notificationId);
    
    if (result === true) {
      logResult(true, 'Suppression de notification', `Notification ${notificationId} supprimée`);
      return true;
    } else {
      logResult(false, 'Suppression de notification', 'La notification n\'a pas été supprimée');
      return false;
    }
  } catch (error) {
    logResult(false, 'Suppression de notification', error.message);
    return false;
  }
}

// Test de suppression des notifications lues
async function testDeleteReadNotifications() {
  try {
    const testProfileId = 1;
    const count = await NotificationService.deleteReadNotifications(testProfileId);
    
    if (typeof count === 'number') {
      logResult(true, 'Suppression des notifications lues', `${count} notifications supprimées`);
      return true;
    } else {
      logResult(false, 'Suppression des notifications lues', 'Format de retour invalide');
      return false;
    }
  } catch (error) {
    logResult(false, 'Suppression des notifications lues', error.message);
    return false;
  }
}

// Test de création de notification de quiz
async function testCreateQuizNotification() {
  try {
    const testProfileId = 1;
    const quizData = {
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      lessonTitle: 'Test de leçon'
    };
    
    const notification = await NotificationService.createQuizCompletionNotification(testProfileId, quizData);
    
    if (notification && notification.id && notification.type === 'quiz_completed') {
      logResult(true, 'Création de notification de quiz', `ID: ${notification.id}, Type: ${notification.type}`);
      return notification.id;
    } else {
      logResult(false, 'Création de notification de quiz', 'Format de notification invalide');
      return null;
    }
  } catch (error) {
    logResult(false, 'Création de notification de quiz', error.message);
    return null;
  }
}

// Test des statistiques de notifications
async function testNotificationStats() {
  try {
    const testProfileId = 1;
    const stats = await NotificationService.getNotificationStats(testProfileId);
    
    if (stats && typeof stats.total === 'number') {
      logResult(true, 'Récupération des statistiques', 
        `Total: ${stats.total}, Non lues: ${stats.unread}, Quiz: ${stats.quiz_notifications}`);
      return stats;
    } else {
      logResult(false, 'Récupération des statistiques', 'Format de statistiques invalide');
      return null;
    }
  } catch (error) {
    logResult(false, 'Récupération des statistiques', error.message);
    return null;
  }
}

// Test de performance des notifications
async function testNotificationPerformance() {
  try {
    const testProfileId = 1;
    const startTime = Date.now();
    
    // Créer 10 notifications rapidement
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(NotificationService.createNotification(
        testProfileId,
        'performance_test',
        `Test de performance ${i + 1}`,
        `Message de test ${i + 1}`,
        { testIndex: i + 1 }
      ));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (duration < 5000) { // Moins de 5 secondes
      logResult(true, 'Test de performance', `${duration}ms pour créer 10 notifications`);
      return true;
    } else {
      logResult(false, 'Test de performance', `${duration}ms - Trop lent (>5s)`);
      return false;
    }
  } catch (error) {
    logResult(false, 'Test de performance', error.message);
    return false;
  }
}

// Test de validation des données
async function testDataValidation() {
  try {
    const testProfileId = 1;
    let validationPassed = true;
    
    // Test avec des données invalides
    try {
      await NotificationService.createNotification(null, 'test', 'Test', 'Test');
      validationPassed = false;
    } catch (error) {
      // Attendu - profileId ne peut pas être null
    }
    
    try {
      await NotificationService.createNotification(testProfileId, '', 'Test', 'Test');
      validationPassed = false;
    } catch (error) {
      // Attendu - type ne peut pas être vide
    }
    
    try {
      await NotificationService.createNotification(testProfileId, 'test', '', 'Test');
      validationPassed = false;
    } catch (error) {
      // Attendu - title ne peut pas être vide
    }
    
    if (validationPassed) {
      logResult(true, 'Validation des données', 'Validation des paramètres fonctionne');
      return true;
    } else {
      logResult(false, 'Validation des données', 'Validation des paramètres échouée');
      return false;
    }
  } catch (error) {
    logResult(false, 'Validation des données', error.message);
    return false;
  }
}

// Fonction principale pour exécuter tous les tests
async function runAllTests() {
  log(`${colors.bold}🚀 Démarrage des tests de notifications${colors.reset}`);
  log('='.repeat(60));
  
  const tests = [
    { name: 'Connexion à la base de données', fn: testDatabaseConnection },
    { name: 'Validation des données', fn: testDataValidation },
    { name: 'Création de notification', fn: testCreateNotification },
    { name: 'Récupération des notifications', fn: testGetNotifications },
    { name: 'Récupération des notifications non lues', fn: testGetUnreadNotifications },
    { name: 'Marquage comme lu', fn: () => testMarkAsRead(1) },
    { name: 'Marquage de toutes comme lues', fn: testMarkAllAsRead },
    { name: 'Suppression de notification', fn: () => testDeleteNotification(1) },
    { name: 'Suppression des notifications lues', fn: testDeleteReadNotifications },
    { name: 'Création de notification de quiz', fn: testCreateQuizNotification },
    { name: 'Statistiques des notifications', fn: testNotificationStats },
    { name: 'Test de performance', fn: testNotificationPerformance }
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
    log('\n🎉 Tous les tests sont passés ! Le système de notifications fonctionne parfaitement.', 'green');
  } else {
    log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.', 'yellow');
  }
  
  return totalPassed === totalTests;
}

// Exécuter les tests
runAllTests().catch(console.error);

export { runAllTests };
