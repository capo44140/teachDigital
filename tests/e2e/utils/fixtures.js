/**
 * Fixtures et données de test pour TeachDigital
 */

/**
 * Données de profils de test
 */
export const testProfiles = {
  parent: {
    id: 1,
    name: 'Parent',
    type: 'parent',
    is_admin: true,
    is_child: false,
    is_teen: false,
    age: null,
    pin: '1234'
  },
  child: {
    id: 2,
    name: 'Enfant',
    type: 'child',
    is_admin: false,
    is_child: true,
    is_teen: false,
    age: 8,
    pin: null
  },
  teen: {
    id: 3,
    name: 'Adolescent',
    type: 'teen',
    is_admin: false,
    is_child: false,
    is_teen: true,
    age: 14,
    pin: null
  }
}

/**
 * Données de quiz de test
 */
export const testQuizzes = {
  math: {
    title: 'Quiz de Mathématiques',
    questions: [
      {
        question: 'Combien font 2 + 2 ?',
        options: ['3', '4', '5', '6'],
        correct: 1
      },
      {
        question: 'Quel est le résultat de 5 × 3 ?',
        options: ['12', '15', '18', '20'],
        correct: 1
      }
    ]
  },
  science: {
    title: 'Quiz de Sciences',
    questions: [
      {
        question: 'Quelle est la planète la plus proche du Soleil ?',
        options: ['Vénus', 'Mercure', 'Terre', 'Mars'],
        correct: 1
      }
    ]
  }
}

/**
 * Données de leçons de test
 */
export const testLessons = {
  math: {
    title: 'Addition et Soustraction',
    description: 'Apprendre les bases des opérations mathématiques',
    content: 'Voici comment additionner et soustraire...',
    difficulty: 'beginner',
    subject: 'math'
  },
  reading: {
    title: 'Lecture de Base',
    description: 'Développer les compétences de lecture',
    content: 'Commençons par les lettres de l\'alphabet...',
    difficulty: 'beginner',
    subject: 'reading'
  }
}

/**
 * URLs de vidéos YouTube Kids de test
 */
export const testYouTubeVideos = {
  educational: [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll (pour les tests)
    'https://www.youtube.com/watch?v=9bZkp7q19f0'  // PSY - GANGNAM STYLE
  ],
  music: [
    'https://www.youtube.com/watch?v=kJQP7kiw5Fk'  // Despacito
  ]
}

/**
 * Messages d'erreur attendus
 */
export const errorMessages = {
  invalidPin: 'Code PIN incorrect',
  profileNotFound: 'Profil non trouvé',
  networkError: 'Erreur de connexion',
  permissionDenied: 'Accès refusé',
  sessionExpired: 'Session expirée'
}

/**
 * Messages de succès attendus
 */
export const successMessages = {
  profileCreated: 'Profil créé avec succès',
  profileUpdated: 'Profil mis à jour',
  profileDeleted: 'Profil supprimé',
  pinUpdated: 'Code PIN mis à jour',
  quizCompleted: 'Quiz terminé !'
}

/**
 * Sélecteurs de test communs
 */
export const selectors = {
  // Navigation
  profileSelector: '[data-testid="profile-selector"]',
  profileCard: '[data-testid="profile-card"]',
  profileButton: '[data-testid="profile-button"]',
  
  // Authentification
  pinInput: '[data-testid="pin-input"]',
  pinSubmit: '[data-testid="pin-submit"]',
  pinError: '[data-testid="pin-error"]',
  
  // Dashboard
  dashboard: '[data-testid="dashboard"]',
  userDashboard: '[data-testid="user-dashboard"]',
  parentDashboard: '[data-testid="parent-dashboard"]',
  
  // Profils
  addProfileButton: '[data-testid="add-profile-button"]',
  profileName: '[data-testid="profile-name"]',
  profileType: '[data-testid="profile-type"]',
  profileAge: '[data-testid="profile-age"]',
  saveProfile: '[data-testid="save-profile"]',
  deleteProfile: '[data-testid="delete-profile"]',
  
  // Quiz
  quizContainer: '[data-testid="quiz-container"]',
  quizQuestion: '[data-testid="quiz-question"]',
  quizOption: '[data-testid="quiz-option"]',
  quizSubmit: '[data-testid="quiz-submit"]',
  quizResult: '[data-testid="quiz-result"]',
  
  // YouTube
  youtubePlayer: '[data-testid="youtube-player"]',
  youtubeIframe: 'iframe[src*="youtube.com"]',
  videoControls: '[data-testid="video-controls"]',
  
  // Notifications
  notification: '[data-testid="notification"]',
  notificationClose: '[data-testid="notification-close"]',
  
  // PWA
  installButton: '[data-testid="install-button"]',
  updateButton: '[data-testid="update-button"]',
  
  // Navigation
  backButton: '[data-testid="back-button"]',
  menuButton: '[data-testid="menu-button"]',
  settingsButton: '[data-testid="settings-button"]'
}

/**
 * Timeouts pour les tests
 */
export const timeouts = {
  short: 2000,
  medium: 5000,
  long: 10000,
  veryLong: 30000
}

/**
 * Configuration des navigateurs de test
 */
export const browserConfigs = {
  desktop: {
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  },
  tablet: {
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  mobile: {
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  }
}

/**
 * Données de test pour les formulaires
 */
export const formData = {
  validProfile: {
    name: 'Test Profile',
    type: 'child',
    age: '10'
  },
  invalidProfile: {
    name: '',
    type: '',
    age: 'abc'
  },
  validPin: '1234',
  invalidPin: '0000'
}

/**
 * États de l'application pour les tests
 */
export const appStates = {
  loading: 'loading',
  ready: 'ready',
  error: 'error',
  offline: 'offline'
}
