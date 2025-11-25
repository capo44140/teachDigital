/**
 * Tests pour les endpoints de notifications
 */

const {
  handleNotifications,
  handleNotification
} = require('../../controllers/notificationController.js');
const {
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');
const { default: sql } = require('../../lib/database.js');

describe('API Endpoints - Notifications', () => {
  let testProfile;
  let adminProfile;
  let testProfileIds = [];
  let testNotificationIds = [];

  beforeAll(async () => {
    try {
      // Créer un profil enfant de test
      testProfile = await createTestProfile({
        name: 'Test Notification Profile',
        type: 'child'
      });
      testProfileIds.push(testProfile.id);

      // Créer un profil admin de test
      adminProfile = await createTestProfile({
        name: 'Test Admin Profile',
        type: 'admin',
        is_admin: true
      });
      testProfileIds.push(adminProfile.id);

      await createTestPin(testProfile.id, '1234');
      await createTestPin(adminProfile.id, '5678');
    } catch (error) {
      console.error('Erreur dans beforeAll (notifications.test.js):', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    // Nettoyer les notifications
    if (testNotificationIds.length > 0) {
      await sql`DELETE FROM notifications WHERE id = ANY(${testNotificationIds})`;
    }
    await cleanupTestData(testProfileIds);
  });

  describe('GET /api/notifications', () => {
    it('devrait récupérer les notifications d\'un profil', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', '/api/notifications', {}, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleNotifications(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toBeDefined();
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
    });

    it('devrait filtrer les notifications par profileId', async () => {
      const req = createMockRequest('GET', `/api/notifications?profileId=${testProfile.id}`);
      const res = createMockResponse();

      await handleNotifications(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toBeDefined();
    });

    it('devrait filtrer les notifications par isRead', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', '/api/notifications?isRead=false', {}, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleNotifications(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toBeDefined();
    });

    it('devrait refuser l\'accès sans authentification si profileId manquant', async () => {
      const req = createMockRequest('GET', '/api/notifications');
      const res = createMockResponse();

      await handleNotifications(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/notifications', () => {
    it('devrait créer une notification avec un admin', async () => {
      const token = generateTestToken(adminProfile);
      const req = createMockRequest('POST', '/api/notifications', {
        profileId: testProfile.id,
        type: 'info',
        title: 'Test Notification',
        message: 'Ceci est une notification de test',
        data: { test: true }
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleNotifications(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification).toBeDefined();
      expect(res.body.data.notification.title).toBe('Test Notification');
      
      if (res.body.data.notification.id) {
        testNotificationIds.push(res.body.data.notification.id);
      }
    });

    it('devrait refuser la création sans être admin', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/notifications', {
        profileId: testProfile.id,
        type: 'info',
        title: 'Unauthorized Notification',
        message: 'Test'
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleNotifications(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Admin');
    });

    it('devrait refuser la création sans authentification', async () => {
      const req = createMockRequest('POST', '/api/notifications', {
        profileId: testProfile.id,
        type: 'info',
        title: 'Test',
        message: 'Test'
      });
      const res = createMockResponse();

      await handleNotifications(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('devrait refuser la création sans champs requis', async () => {
      const token = generateTestToken(adminProfile);
      const req = createMockRequest('POST', '/api/notifications', {
        profileId: testProfile.id
        // Manque type, title, message
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleNotifications(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/:id', () => {
    it('devrait récupérer une notification par ID', async () => {
      // Créer une notification de test
      const result = await sql`
        INSERT INTO notifications (profile_id, type, title, message)
        VALUES (${testProfile.id}, 'info', 'Test Notification', 'Test message')
        RETURNING *
      `;
      const notification = result[0];
      testNotificationIds.push(notification.id);

      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', `/api/notifications/${notification.id}`, {}, {
        authorization: `Bearer ${token}`
      }, {
        id: notification.id
      });
      const res = createMockResponse();

      await handleNotification(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification).toBeDefined();
      expect(res.body.data.notification.id).toBe(notification.id);
    });

    it('devrait retourner 404 pour une notification inexistante', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', '/api/notifications/99999', {}, {
        authorization: `Bearer ${token}`
      }, {
        id: '99999'
      });
      const res = createMockResponse();

      await handleNotification(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/notifications/:id', () => {
    it('devrait mettre à jour une notification', async () => {
      // Créer une notification de test
      const result = await sql`
        INSERT INTO notifications (profile_id, type, title, message)
        VALUES (${testProfile.id}, 'info', 'Test Notification', 'Test message')
        RETURNING *
      `;
      const notification = result[0];
      testNotificationIds.push(notification.id);

      const token = generateTestToken(testProfile);
      const req = createMockRequest('PUT', `/api/notifications/${notification.id}`, {
        isRead: true
      }, {
        authorization: `Bearer ${token}`
      }, {
        id: notification.id
      });
      const res = createMockResponse();

      await handleNotification(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.is_read).toBe(true);
    });

    it('devrait refuser la mise à jour sans authentification', async () => {
      const req = createMockRequest('PUT', '/api/notifications/1', {
        isRead: true
      }, {}, {
        id: '1'
      });
      const res = createMockResponse();

      await handleNotification(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('devrait supprimer une notification', async () => {
      // Créer une notification de test
      const result = await sql`
        INSERT INTO notifications (profile_id, type, title, message)
        VALUES (${testProfile.id}, 'info', 'Test Notification to Delete', 'Test message')
        RETURNING *
      `;
      const notification = result[0];

      const token = generateTestToken(testProfile);
      const req = createMockRequest('DELETE', `/api/notifications/${notification.id}`, {}, {
        authorization: `Bearer ${token}`
      }, {
        id: notification.id
      });
      const res = createMockResponse();

      await handleNotification(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('devrait refuser la suppression sans authentification', async () => {
      const req = createMockRequest('DELETE', '/api/notifications/1', {}, {}, {
        id: '1'
      });
      const res = createMockResponse();

      await handleNotification(req, res);

      expect(res.statusCode).toBe(401);
    });
  });
});

