/**
 * Tests pour les endpoints de leçons (contrôleur, base de test dédiée).
 * Les règles d'accès complètes passent par le routeur : voir isolation.test.js.
 */

const {
  handleLessons,
  handleLesson,
  handleQuizResults
} = require('../../controllers/lessonController.js');
const {
  describeWithDb,
  createTestProfile,
  createTestPin,
  createTestLesson,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

const QUIZ = {
  title: 'Additions',
  questions: [
    { question: '2 + 2 ?', options: ['3', '4', '5', '6'], correctAnswer: 1 },
    { question: '3 + 3 ?', options: ['6', '7', '8', '9'], correctAnswer: 0 }
  ]
};

const bearer = profile => ({ authorization: `Bearer ${generateTestToken(profile)}` });

describeWithDb('API Endpoints - Leçons', () => {
  let testProfile;
  let adminProfile;
  let testLesson;
  const testProfileIds = [];
  const testLessonIds = [];

  beforeAll(async () => {
    testProfile = await createTestProfile({ name: 'Test Lesson Profile', type: 'child' });
    adminProfile = await createTestProfile({ name: 'Test Lesson Admin', type: 'admin', is_admin: true, is_child: false });
    testProfileIds.push(testProfile.id, adminProfile.id);
    await createTestPin(testProfile.id, '1357');

    // Leçon publiée non ciblée (target_profile_id NULL) : visible par tous les enfants
    testLesson = await createTestLesson(adminProfile.id, { title: 'Test Lesson', quiz_data: QUIZ });
    testLessonIds.push(testLesson.id);
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testProfileIds, testLessonIds);
  });

  describe('GET /api/lessons', () => {
    it('devrait récupérer les leçons publiées', async () => {
      const req = createMockRequest('GET', '/api/lessons', {}, bearer(testProfile));
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.lessons)).toBe(true);
      expect(res.body.data.lessons.map(l => l.id)).toContain(testLesson.id);
      res.body.data.lessons.forEach(lesson => expect(lesson.is_published).toBe(true));
      // Les listes ne contiennent jamais les réponses
      res.body.data.lessons.forEach(lesson => expect(lesson.quiz_data).toBeUndefined());
    });

    it('devrait filtrer les leçons par profileId (créateur ou cible)', async () => {
      const req = createMockRequest('GET', `/api/lessons?profileId=${adminProfile.id}`, {}, bearer(adminProfile));
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(200);
      res.body.data.lessons.forEach(lesson => {
        expect([lesson.profile_id, lesson.target_profile_id]).toContain(adminProfile.id);
      });
    });

    it('devrait filtrer les leçons par published (parent)', async () => {
      const req = createMockRequest('GET', '/api/lessons?published=true', {}, bearer(adminProfile));
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(200);
      res.body.data.lessons.forEach(lesson => expect(lesson.is_published).toBe(true));
    });
  });

  describe('POST /api/lessons', () => {
    it('devrait créer une nouvelle leçon', async () => {
      const req = createMockRequest('POST', '/api/lessons', {
        title: 'New Test Lesson',
        description: 'Description de test',
        subject: 'math',
        level: 'beginner',
        quizData: QUIZ,
        isPublished: true,
        targetProfileId: testProfile.id
      }, bearer(adminProfile));
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.lesson.title).toBe('New Test Lesson');
      expect(res.body.data.lesson.target_profile_id).toBe(testProfile.id);
      testLessonIds.push(res.body.data.lesson.id);
    });

    it('devrait refuser la création sans utilisateur (le 401 est renvoyé par le routeur)', async () => {
      const req = createMockRequest('POST', '/api/lessons', { title: 'Unauthorized Lesson', quizData: QUIZ });
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('devrait refuser la création à un profil non-admin', async () => {
      const req = createMockRequest('POST', '/api/lessons', { title: 'Lesson by non-admin', quizData: QUIZ }, bearer(testProfile));
      const res = createMockResponse();

      await handleLessons(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('devrait refuser la création sans titre ou sans quizData', async () => {
      for (const body of [{ quizData: QUIZ }, { title: 'Lesson without quiz' }]) {
        const req = createMockRequest('POST', '/api/lessons', body, bearer(adminProfile));
        const res = createMockResponse();

        await handleLessons(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });
  });

  describe('GET /api/lessons/:id', () => {
    it('devrait récupérer une leçon publiée par ID (avec le quiz)', async () => {
      const req = createMockRequest('GET', `/api/lessons/${testLesson.id}`, {}, bearer(testProfile), { id: testLesson.id });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.lesson.id).toBe(testLesson.id);
      expect(res.body.data.lesson.quiz_data.questions).toHaveLength(2);
    });

    it('devrait retourner 404 pour une leçon inexistante', async () => {
      const req = createMockRequest('GET', '/api/lessons/99999', {}, bearer(testProfile), { id: '99999' });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/lessons/:id', () => {
    it('devrait mettre à jour une leçon (parent)', async () => {
      const req = createMockRequest('PUT', `/api/lessons/${testLesson.id}`, {
        title: 'Updated Lesson Title',
        description: 'Updated description'
      }, bearer(adminProfile), { id: testLesson.id });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.lesson.title).toBe('Updated Lesson Title');
    });

    it('devrait refuser la mise à jour sans droits parent', async () => {
      for (const headers of [{}, bearer(testProfile)]) {
        const req = createMockRequest('PUT', `/api/lessons/${testLesson.id}`, { title: 'Unauthorized Update' }, headers, { id: testLesson.id });
        const res = createMockResponse();

        await handleLesson(req, res);

        expect(res.statusCode).toBe(403);
      }
    });
  });

  describe('DELETE /api/lessons/:id', () => {
    it('devrait supprimer une leçon (parent)', async () => {
      const tempLesson = await createTestLesson(adminProfile.id, { title: 'Temp Lesson to Delete' });
      testLessonIds.push(tempLesson.id);

      const req = createMockRequest('DELETE', `/api/lessons/${tempLesson.id}`, {}, bearer(adminProfile), { id: tempLesson.id });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('devrait refuser la suppression sans droits parent', async () => {
      const req = createMockRequest('DELETE', `/api/lessons/${testLesson.id}`, {}, bearer(testProfile), { id: testLesson.id });
      const res = createMockResponse();

      await handleLesson(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/lessons/:id/quiz-results', () => {
    it('devrait récupérer les résultats de quiz d\'une leçon', async () => {
      const req = createMockRequest(
        'GET',
        `/api/lessons/${testLesson.id}/quiz-results?profileId=${testProfile.id}`,
        {},
        bearer(testProfile),
        { id: testLesson.id }
      );
      const res = createMockResponse();

      await handleQuizResults(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.results)).toBe(true);
    });
  });

  describe('POST /api/lessons/:id/quiz-results', () => {
    it('devrait recalculer le score à partir des réponses (score client ignoré)', async () => {
      const req = createMockRequest('POST', `/api/lessons/${testLesson.id}/quiz-results`, {
        profileId: testProfile.id,
        answers: [1, 3],
        score: 2,
        totalQuestions: 2,
        percentage: 100
      }, bearer(testProfile), { id: testLesson.id });
      const res = createMockResponse();

      await handleQuizResults(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({ score: 1, totalQuestions: 2, percentage: 50 });
      expect(res.body.data.result.score).toBe(1);
      expect(res.body.data.result.total_questions).toBe(2);
    });

    it('devrait refuser l\'enregistrement sans utilisateur', async () => {
      const req = createMockRequest('POST', `/api/lessons/${testLesson.id}/quiz-results`, {
        profileId: testProfile.id,
        answers: [1, 0]
      }, {}, { id: testLesson.id });
      const res = createMockResponse();

      await handleQuizResults(req, res);

      // Le 401 (jeton manquant) est vérifié par le routeur ; le contrôleur refuse l'action.
      expect(res.statusCode).toBe(403);
    });
  });
});
