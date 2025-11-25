/**
 * Helpers pour les tests d'endpoints API
 */

const { default: sql } = require('../../lib/database.js');
const { generateToken } = require('../../lib/auth.js');
const { NativeHashService } = require('../../lib/nativeHash.js');

/**
 * Crée un profil de test
 */
async function createTestProfile(overrides = {}) {
  try {
    const profileData = {
      name: `Test Profile ${Date.now()}`, // Nom unique pour éviter les conflits
      description: 'Profil de test',
      type: 'child',
      color: 'blue',
      is_admin: false,
      is_child: true,
      is_teen: false,
      is_active: true,
      ...overrides
    };

    const result = await sql`
      INSERT INTO profiles (
        name, description, type, color, 
        is_admin, is_child, is_teen, is_active
      )
      VALUES (
        ${profileData.name}, ${profileData.description}, ${profileData.type}, ${profileData.color},
        ${profileData.is_admin}, ${profileData.is_child}, ${profileData.is_teen}, ${profileData.is_active}
      )
      RETURNING *
    `;

    if (!result || result.length === 0) {
      throw new Error('Échec de création du profil de test');
    }

    return result[0];
  } catch (error) {
    console.error('Erreur lors de la création du profil de test:', error);
    throw error;
  }
}

/**
 * Crée un code PIN pour un profil
 */
async function createTestPin(profileId, pin = '1234') {
  try {
    const hashedPin = await NativeHashService.hashPin(pin);
    
    const result = await sql`
      INSERT INTO pin_codes (profile_id, pin_code)
      VALUES (${profileId}, ${hashedPin})
      RETURNING *
    `;

    if (!result || result.length === 0) {
      throw new Error('Échec de création du PIN de test');
    }

    return result[0];
  } catch (error) {
    console.error('Erreur lors de la création du PIN de test:', error);
    throw error;
  }
}

/**
 * Génère un token JWT pour un profil
 */
function generateTestToken(profile) {
  return generateToken({
    profileId: profile.id,
    name: profile.name,
    type: profile.type,
    isAdmin: profile.is_admin
  });
}

/**
 * Nettoie les données de test
 */
async function cleanupTestData(profileIds = [], lessonIds = [], badgeIds = []) {
  try {
    // Supprimer dans l'ordre des dépendances
    if (profileIds.length > 0) {
      await sql`DELETE FROM profile_badges WHERE profile_id = ANY(${profileIds})`;
      await sql`DELETE FROM quiz_results WHERE profile_id = ANY(${profileIds})`;
      await sql`DELETE FROM notifications WHERE profile_id = ANY(${profileIds})`;
      await sql`DELETE FROM pin_codes WHERE profile_id = ANY(${profileIds})`;
      await sql`DELETE FROM sessions WHERE profile_id = ANY(${profileIds})`;
    }

    if (lessonIds.length > 0) {
      await sql`DELETE FROM quiz_results WHERE lesson_id = ANY(${lessonIds})`;
      await sql`DELETE FROM lessons WHERE id = ANY(${lessonIds})`;
    }

    if (badgeIds.length > 0) {
      await sql`DELETE FROM profile_badges WHERE badge_id = ANY(${badgeIds})`;
      await sql`DELETE FROM badges WHERE id = ANY(${badgeIds})`;
    }

    if (profileIds.length > 0) {
      await sql`DELETE FROM profiles WHERE id = ANY(${profileIds})`;
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
  }
}

/**
 * Crée une requête HTTP mock pour les tests (compatible Express)
 */
function createMockRequest(method = 'GET', path = '/', body = {}, headers = {}, params = {}) {
  const url = new URL(path, 'http://localhost:3001');
  
  // Extraire les paramètres de route depuis le chemin si non fournis
  const routeParams = { ...params };
  if (Object.keys(routeParams).length === 0 && path.includes('/')) {
    const pathParts = url.pathname.split('/').filter(p => p);
    // Essayer d'extraire l'ID si c'est le dernier segment
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      // Si c'est un nombre, c'est probablement un ID
      if (/^\d+$/.test(lastPart)) {
        routeParams.id = lastPart;
      }
    }
  }
  
  const req = {
    method,
    url: url.pathname + url.search,
    path: url.pathname,
    originalUrl: url.pathname + url.search,
    query: Object.fromEntries(url.searchParams),
    params: routeParams,
    body,
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3001',
      ...headers
    },
    get: function(name) {
      return this.headers[name.toLowerCase()];
    },
    header: function(name) {
      return this.headers[name.toLowerCase()];
    }
  };
  
  return req;
}

/**
 * Crée une réponse HTTP mock pour les tests (compatible Express)
 */
function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = data;
      this.statusCode = this.statusCode || 200;
      return this;
    },
    send: function(data) {
      this.body = data;
      this.statusCode = this.statusCode || 200;
      return this;
    },
    end: function() {
      return this;
    },
    setHeader: function(name, value) {
      this.headers[name] = value;
    },
    getHeader: function(name) {
      return this.headers[name];
    }
  };
  return res;
}

/**
 * Crée une leçon de test
 */
async function createTestLesson(profileId, overrides = {}) {
  const lessonData = {
    title: 'Test Lesson',
    description: 'Description de test',
    subject: 'math',
    level: 'beginner',
    profile_id: profileId,
    quiz_data: { questions: [] },
    is_published: true,
    ...overrides
  };

  const result = await sql`
    INSERT INTO lessons (
      title, description, subject, level, profile_id, quiz_data, is_published
    )
    VALUES (
      ${lessonData.title}, ${lessonData.description}, ${lessonData.subject}, 
      ${lessonData.level}, ${lessonData.profile_id}, 
      ${JSON.stringify(lessonData.quiz_data)}, ${lessonData.is_published}
    )
    RETURNING *
  `;

  return result[0];
}

/**
 * Crée un badge de test
 */
async function createTestBadge(overrides = {}) {
  const badgeData = {
    name: 'Test Badge',
    description: 'Badge de test',
    icon: '🏆',
    category: 'test',
    condition_type: 'quiz_completed',
    condition_value: 1,
    points: 10,
    color: 'blue',
    ...overrides
  };

  const result = await sql`
    INSERT INTO badges (
      name, description, icon, category, condition_type, condition_value, points, color
    )
    VALUES (
      ${badgeData.name}, ${badgeData.description}, ${badgeData.icon}, 
      ${badgeData.category}, ${badgeData.condition_type}, ${badgeData.condition_value}, 
      ${badgeData.points}, ${badgeData.color}
    )
    RETURNING *
  `;

  return result[0];
}

module.exports = {
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse,
  createTestLesson,
  createTestBadge
};

