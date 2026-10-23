/**
 * Matrice d'isolation des profils (routeur Express réel + base de test dédiée).
 *
 * Pour chaque lecture liée à un profil : jeton famille, enfant A, enfant B, parent.
 * - jeton famille : tous les enfants, jamais le parent ;
 * - jeton enfant : uniquement lui-même ;
 * - parent : tout.
 */

jest.mock('../../api/ai/index.js', () => (req, res) => res.status(200).json({ success: true }));

const {
  describeWithDb,
  createTestProfile,
  cleanupTestData
} = require('../helpers/testHelpers.js');
const { default: sql } = require('../../lib/database.js');
const { startApp } = require('./support/app.js');
const { ensureFamilyGate, currentFamilyToken, currentProfileToken } = require('./support/fixtures.js');

const QUIZ = { questions: [{ question: '1 + 1 ?', options: ['1', '2'], correctAnswer: 1 }] };
const ACTORS = ['family', 'childA', 'childB', 'admin'];

describeWithDb('Isolation des profils', () => {
  let app;
  const tokens = {};
  const ids = {};
  const profileIds = [];
  const lessonIds = [];

  async function insertLesson(title, targetId, isPublished = true) {
    const rows = await sql`
      INSERT INTO lessons (profile_id, title, quiz_data, is_published, target_profile_id)
      VALUES (${ids.parent}, ${title}, ${JSON.stringify(QUIZ)}::jsonb, ${isPublished}, ${targetId})
      RETURNING id
    `;
    lessonIds.push(rows[0].id);
    return rows[0].id;
  }

  async function insertCoursePage(title, targetId, isPublished = true) {
    const rows = await sql`
      INSERT INTO course_pages (profile_id, target_profile_id, title, html_content, is_published)
      VALUES (${ids.parent}, ${targetId}, ${title}, '<p>Révision</p>', ${isPublished})
      RETURNING id
    `;
    return rows[0].id;
  }

  async function insertActivity(title, childId) {
    const rows = await sql`INSERT INTO activities (title, child_id) VALUES (${title}, ${childId}) RETURNING id`;
    return rows[0].id;
  }

  async function insertNotification(profileId, type) {
    const rows = await sql`
      INSERT INTO notifications (profile_id, type, title, message)
      VALUES (${profileId}, ${type}, 'Titre', 'Message')
      RETURNING id
    `;
    return rows[0].id;
  }

  beforeAll(async () => {
    app = await startApp();
    await ensureFamilyGate();

    const parent = await createTestProfile({ name: 'Iso Parent', type: 'admin', is_admin: true, is_child: false });
    const childA = await createTestProfile({ name: 'Iso Enfant A', type: 'child' });
    const childB = await createTestProfile({ name: 'Iso Enfant B', type: 'child' });
    ids.parent = parent.id;
    ids.A = childA.id;
    ids.B = childB.id;
    profileIds.push(parent.id, childA.id, childB.id);

    tokens.admin = await currentProfileToken(parent);
    tokens.childA = await currentProfileToken(childA);
    tokens.childB = await currentProfileToken(childB);
    tokens.family = await currentFamilyToken();

    ids.lessonA = await insertLesson('Leçon A', ids.A);
    ids.lessonB = await insertLesson('Leçon B', ids.B);
    ids.lessonParent = await insertLesson('Leçon du parent', ids.parent);
    ids.lessonDraftA = await insertLesson('Brouillon A', ids.A, false);
    ids.lessonAll = await insertLesson('Leçon pour tous', null);

    ids.pageA = await insertCoursePage('Page A', ids.A);
    ids.pageB = await insertCoursePage('Page B', ids.B);
    ids.pageDraftA = await insertCoursePage('Page brouillon A', ids.A, false);

    ids.activityA = await insertActivity('Activité A', ids.A);
    ids.activityB = await insertActivity('Activité B', ids.B);
    ids.activityParent = await insertActivity('Activité parent', ids.parent);
    ids.activityAll = await insertActivity('Activité commune', null);

    ids.notifParent = await insertNotification(ids.parent, 'profile_request');
    ids.notifA = await insertNotification(ids.A, 'info');
  }, 30000);

  afterAll(async () => {
    await sql`DELETE FROM activities WHERE id = ANY(${[ids.activityA, ids.activityB, ids.activityParent, ids.activityAll]})`;
    await sql`DELETE FROM course_pages WHERE id = ANY(${[ids.pageA, ids.pageB, ids.pageDraftA]})`;
    await cleanupTestData(profileIds, lessonIds);
    await app.close();
  });

  /**
   * Vérifie une route pour chaque acteur. allowed : liste des acteurs autorisés.
   * Les autres reçoivent `deniedStatus` (403, ou 404 quand la ressource est masquée).
   */
  async function expectAccess(method, path, allowed, deniedStatus = 403, body) {
    const resolvedPath = typeof path === 'function' ? path() : path;
    for (const actor of ACTORS) {
      const { status } = await app.call(method, resolvedPath, { token: tokens[actor], body: typeof body === 'function' ? body() : body });
      if (allowed.includes(actor)) {
        // Acteur et route inclus dans la comparaison : le message d'échec indique qui a été refusé
        expect([actor, resolvedPath, status >= 200 && status < 300 ? 'autorisé' : status])
          .toEqual([actor, resolvedPath, 'autorisé']);
      } else {
        expect([actor, resolvedPath, status]).toEqual([actor, resolvedPath, deniedStatus]);
      }
    }
  }

  async function listIds(path, actor, key) {
    const { status, body } = await app.call('GET', path, { token: tokens[actor] });
    expect(status).toBe(200);
    return body.data[key].map(item => item.id);
  }

  describe('Profils', () => {
    it('statistiques d\'apprentissage d\'un enfant', async () => {
      await expectAccess('GET', () => `/profiles/${ids.A}/stats`, ['family', 'childA', 'admin']);
      await expectAccess('GET', () => `/profiles/${ids.A}/learning-stats`, ['family', 'childA', 'admin']);
    });

    it('statistiques d\'apprentissage du parent', async () => {
      await expectAccess('GET', () => `/profiles/${ids.parent}/stats`, ['admin']);
    });

    it('résumé de progression', async () => {
      await expectAccess('GET', () => `/profiles/${ids.A}/progress-summary`, ['family', 'childA', 'admin']);
      await expectAccess('GET', () => `/profiles/${ids.parent}/progress-summary`, ['admin']);
    });
  });

  describe('Badges', () => {
    it.each(['', '/unlocked', '/stats', '/recent'])('badges d\'un enfant%s', async (suffix) => {
      await expectAccess('GET', () => `/badges/profile/${ids.A}${suffix}`, ['family', 'childA', 'admin']);
    });

    it('badges du parent', async () => {
      await expectAccess('GET', () => `/badges/profile/${ids.parent}`, ['admin']);
    });
  });

  describe('Notifications', () => {
    it('liste des notifications d\'un enfant', async () => {
      await expectAccess('GET', () => `/notifications?profileId=${ids.A}`, ['family', 'childA', 'admin']);
    });

    it('liste des notifications du parent (demandes de profil incluses)', async () => {
      await expectAccess('GET', () => `/notifications?profileId=${ids.parent}`, ['admin']);
    });

    it('lecture et modification d\'une notification du parent : invisible hors parent', async () => {
      await expectAccess('GET', () => `/notifications/${ids.notifParent}`, ['admin'], 404);
      await expectAccess('PUT', () => `/notifications/${ids.notifParent}`, ['admin'], 404, { isRead: true });
    });

    it('suppression d\'une notification du parent : refusée hors parent', async () => {
      for (const actor of ['family', 'childA', 'childB']) {
        expect((await app.call('DELETE', `/notifications/${ids.notifParent}`, { token: tokens[actor] })).status).toBe(404);
      }
      const rows = await sql`SELECT id FROM notifications WHERE id = ${ids.notifParent}`;
      expect(rows).toHaveLength(1);
    });

    it('notification d\'un enfant', async () => {
      await expectAccess('GET', () => `/notifications/${ids.notifA}`, ['family', 'childA', 'admin'], 404);
    });

    it('tout marquer comme lu pour le parent', async () => {
      await expectAccess('POST', '/notifications/mark-all-read', ['admin'], 403, () => ({ profileId: ids.parent }));
    });
  });

  describe('Leçons', () => {
    it('liste filtrée sur un enfant', async () => {
      await expectAccess('GET', () => `/lessons?targetProfileId=${ids.A}`, ['family', 'childA', 'admin']);
      await expectAccess('GET', () => `/lessons?profileId=${ids.parent}`, ['admin']);
    });

    it('liste sans filtre : uniquement les leçons publiées des profils accessibles', async () => {
      const forA = await listIds('/lessons', 'childA', 'lessons');
      expect(forA).toEqual(expect.arrayContaining([ids.lessonA, ids.lessonAll]));
      expect(forA).not.toEqual(expect.arrayContaining([ids.lessonB]));
      expect(forA).not.toContain(ids.lessonParent);
      expect(forA).not.toContain(ids.lessonDraftA);

      const forFamily = await listIds('/lessons', 'family', 'lessons');
      expect(forFamily).toEqual(expect.arrayContaining([ids.lessonA, ids.lessonB, ids.lessonAll]));
      expect(forFamily).not.toContain(ids.lessonParent);
      expect(forFamily).not.toContain(ids.lessonDraftA);

      // published=false ne révèle pas les brouillons à un enfant
      expect(await listIds('/lessons?published=false', 'childA', 'lessons')).not.toContain(ids.lessonDraftA);

      const forAdmin = await listIds('/lessons', 'admin', 'lessons');
      expect(forAdmin).toEqual(expect.arrayContaining([ids.lessonA, ids.lessonB, ids.lessonParent, ids.lessonDraftA, ids.lessonAll]));
    });

    it('détail d\'une leçon (avec quiz_data) : 404 si invisible', async () => {
      await expectAccess('GET', () => `/lessons/${ids.lessonA}`, ['family', 'childA', 'admin'], 404);
      await expectAccess('GET', () => `/lessons/${ids.lessonB}`, ['family', 'childB', 'admin'], 404);
      await expectAccess('GET', () => `/lessons/${ids.lessonParent}`, ['admin'], 404);
      await expectAccess('GET', () => `/lessons/${ids.lessonDraftA}`, ['admin'], 404);
      await expectAccess('GET', () => `/lessons/${ids.lessonAll}`, ACTORS, 404);
    });

    it('résultats de quiz d\'un enfant', async () => {
      await expectAccess('GET', () => `/lessons/${ids.lessonA}/quiz-results?profileId=${ids.A}`, ['family', 'childA', 'admin']);
      await expectAccess('GET', () => `/lessons/${ids.lessonParent}/quiz-results?profileId=${ids.parent}`, ['admin']);
    });

    it('enregistrer un résultat pour un enfant', async () => {
      await expectAccess('POST', () => `/lessons/${ids.lessonA}/quiz-results`, ['family', 'childA', 'admin'], 403, () => ({ profileId: ids.A, answers: [1] }));
    });
  });

  describe('Pages de cours', () => {
    it('liste des pages d\'un enfant', async () => {
      await expectAccess('GET', () => `/course-pages?targetProfileId=${ids.A}`, ['family', 'childA', 'admin']);
    });

    it('les brouillons ne sont jamais listés pour un enfant', async () => {
      const pages = await listIds(`/course-pages?targetProfileId=${ids.A}&published=false`, 'childA', 'coursePages');
      expect(pages).toContain(ids.pageA);
      expect(pages).not.toContain(ids.pageDraftA);
    });

    it('détail d\'une page : 404 si invisible', async () => {
      await expectAccess('GET', () => `/course-pages/${ids.pageA}`, ['family', 'childA', 'admin'], 404);
      await expectAccess('GET', () => `/course-pages/${ids.pageDraftA}`, ['admin'], 404);
    });

    it('enregistrer un résultat de page pour un enfant', async () => {
      await expectAccess('POST', () => `/course-pages/${ids.pageA}/results`, ['family', 'childA', 'admin'], 403,
        () => ({ profileId: ids.A, score: 1, totalQuestions: 2 }));
    });
  });

  describe('Activités', () => {
    it('liste : uniquement les activités des profils accessibles (et communes)', async () => {
      const forA = await listIds('/activities', 'childA', 'activities');
      expect(forA).toEqual(expect.arrayContaining([ids.activityA, ids.activityAll]));
      expect(forA).not.toContain(ids.activityB);
      expect(forA).not.toContain(ids.activityParent);

      const forFamily = await listIds('/activities', 'family', 'activities');
      expect(forFamily).toEqual(expect.arrayContaining([ids.activityA, ids.activityB, ids.activityAll]));
      expect(forFamily).not.toContain(ids.activityParent);

      const forAdmin = await listIds('/activities', 'admin', 'activities');
      expect(forAdmin).toEqual(expect.arrayContaining([ids.activityA, ids.activityB, ids.activityParent, ids.activityAll]));
    });

    it('filtre child_id', async () => {
      await expectAccess('GET', () => `/activities?child_id=${ids.A}`, ['family', 'childA', 'admin']);
    });

    it('détail d\'une activité : 404 si invisible', async () => {
      await expectAccess('GET', () => `/activities/${ids.activityB}`, ['family', 'childB', 'admin'], 404);
      await expectAccess('GET', () => `/activities/${ids.activityParent}`, ['admin'], 404);
    });
  });
});
