/**
 * Tests pour les endpoints de leçons
 */

const {
  handleLessons,
  handleLesson,
  handleQuizResults
} = require('../../controllers/lessonController.js');
const {
  createTestProfile,
  createTestPin,
  createTestLesson,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

describe('API Endpoints - Leçons', () => {
  let testProfile;
  let testLesson;
  let testProfileIds = [];
  let testLessonIds = [];

  beforeAll(async () => {
    try {
      // Créer un profil de test
      testProfile = await createTestProfile({
        name: 'Test Lesson Profile',
        type: 'child'
      });
      testProfileIds.push(testProfile.id);

      await createTestPin(testProfile.id, '1234');

      // Créer une leçon de test
      testLesson = await createTestLesson(testProfile.id, {
        title: 'Test Lesson',
        quiz_data: {
          questions: [
            {
              question: 'Test Question',
              answers: ['Answer 1', 'Answer 2'],
              correct: 0
            }
          ]
        }
      });
      testLessonIds.push(testLesson.id);
    } catch (error) {
      console.error('Erreur dans beforeAll (lessons.test.js):', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testProfileIds, testLessonIds);
  });

  describe('GET /api/lessons', () => {
    it('devrait récupérer toutes les leçons', async () => {
      const req = createMockRequest('GET', '/api/lessons');
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lessons).toBeDefined();
      expect(Array.isArray(res.body.data.lessons)).toBe(true);
    });

    it('devrait filtrer les leçons par profileId', async () => {
      const req = createMockRequest('GET', `/api/lessons?profileId=${testProfile.id}`);
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lessons).toBeDefined();
      // Toutes les leçons devraient appartenir au profil
      res.body.data.lessons.forEach(lesson => {
        expect(lesson.profile_id).toBe(testProfile.id);
      });
    });

    it('devrait filtrer les leçons par published', async () => {
      const req = createMockRequest('GET', '/api/lessons?published=true');
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lessons).toBeDefined();
      // Toutes les leçons devraient être publiées
      res.body.data.lessons.forEach(lesson => {
        expect(lesson.is_published).toBe(true);
      });
    });
  });

  describe('POST /api/lessons', () => {
    it('devrait créer une nouvelle leçon', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/lessons', {
        title: 'New Test Lesson',
        description: 'Description de test',
        subject: 'math',
        level: 'beginner',
        quizData: {
          questions: [
            {
              question: 'What is 2+2?',
              answers: ['3', '4', '5'],
              correct: 1
            }
          ]
        },
        isPublished: true
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lesson).toBeDefined();
      expect(res.body.data.lesson.title).toBe('New Test Lesson');
      
      if (res.body.data.lesson.id) {
        testLessonIds.push(res.body.data.lesson.id);
      }
    });

    it('devrait refuser la création sans authentification', async () => {
      const req = createMockRequest('POST', '/api/lessons', {
        title: 'Unauthorized Lesson',
        quizData: {}
      });
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('devrait refuser la création sans titre', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/lessons', {
        quizData: {}
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('devrait refuser la création sans quizData', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/lessons', {
        title: 'Lesson without quiz'
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/lessons/:id', () => {
    it('devrait récupérer une leçon par ID', async () => {
      const req = createMockRequest('GET', `/api/lessons/${testLesson.id}`, {}, {}, {
        id: testLesson.id
      });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lesson).toBeDefined();
      expect(res.body.data.lesson.id).toBe(testLesson.id);
    });

    it('devrait retourner 404 pour une leçon inexistante', async () => {
      const req = createMockRequest('GET', '/api/lessons/99999', {}, {}, {
        id: '99999'
      });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/lessons/:id', () => {
    it('devrait mettre à jour une leçon', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('PUT', `/api/lessons/${testLesson.id}`, {
        title: 'Updated Lesson Title',
        description: 'Updated description'
      }, {
        authorization: `Bearer ${token}`
      }, {
        id: testLesson.id
      });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lesson.title).toBe('Updated Lesson Title');
    });

    it('devrait refuser la mise à jour sans authentification', async () => {
      const req = createMockRequest('PUT', `/api/lessons/${testLesson.id}`, {
        title: 'Unauthorized Update'
      }, {}, {
        id: testLesson.id
      });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/lessons/:id', () => {
    it('devrait supprimer une leçon', async () => {
      // Créer une leçon temporaire à supprimer
      const tempLesson = await createTestLesson(testProfile.id, {
        title: 'Temp Lesson to Delete'
      });
      testLessonIds.push(tempLesson.id);

      const token = generateTestToken(testProfile);
      const req = createMockRequest('DELETE', `/api/lessons/${tempLesson.id}`, {}, {
        authorization: `Bearer ${token}`
      }, {
        id: tempLesson.id
      });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('devrait refuser la suppression sans authentification', async () => {
      const req = createMockRequest('DELETE', `/api/lessons/${testLesson.id}`, {}, {}, {
        id: testLesson.id
      });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/lessons/:id/quiz-results', () => {
    it('devrait récupérer les résultats de quiz d\'une leçon', async () => {
      const req = createMockRequest('GET', `/api/lessons/${testLesson.id}/quiz-results`, {}, {}, {
        id: testLesson.id
      });
      const res = createMockResponse();

      await handleQuizResults(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quizResults).toBeDefined();
      expect(Array.isArray(res.body.data.quizResults)).toBe(true);
    });
  });

  describe('POST /api/lessons/:id/quiz-results', () => {
    it('devrait créer un résultat de quiz', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', `/api/lessons/${testLesson.id}/quiz-results`, {
        score: 8,
        totalQuestions: 10,
        percentage: 80,
        answers: [
          { questionId: 0, answer: 0, isCorrect: true }
        ]
      }, {
        authorization: `Bearer ${token}`
      }, {
        id: testLesson.id
      });
      const res = createMockResponse();

      await handleQuizResults(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quizResult).toBeDefined();
      expect(res.body.data.quizResult.score).toBe(8);
    });

    it('devrait refuser la création sans authentification', async () => {
      const req = createMockRequest('POST', `/api/lessons/${testLesson.id}/quiz-results`, {
        score: 8,
        totalQuestions: 10,
        percentage: 80
      }, {}, {
        id: testLesson.id
      });
      const res = createMockResponse();

      await handleQuizResults(req, res);

      expect(res.statusCode).toBe(401);
    });
  });
});

