/**
 * Affichage isolé des pages de cours (routeur Express réel + base de test dédiée) :
 * POST /course-pages/:id/view, POST /course-pages/preview, GET /course-pages/render
 */

jest.mock('../../api/ai/index.js', () => (req, res) => res.status(200).json({ success: true }));

const {
  describeWithDb,
  createTestProfile,
  cleanupTestData
} = require('../helpers/testHelpers.js');
const { default: sql } = require('../../lib/database.js');
const { COURSE_PAGE_CSP, clearPreviews } = require('../../lib/coursePageView.js');
const { startApp } = require('./support/app.js');
const { ensureFamilyGate, currentFamilyToken, currentProfileToken } = require('./support/fixtures.js');

describeWithDb('Affichage isolé des pages de cours', () => {
  let app;
  const tokens = {};
  const ids = {};
  const profileIds = [];

  async function insertCoursePage(title, targetId, isPublished = true) {
    const rows = await sql`
      INSERT INTO course_pages (profile_id, target_profile_id, title, html_content, is_published)
      VALUES (${ids.parent}, ${targetId}, ${title}, ${`<html><body><h1>${title}</h1></body></html>`}, ${isPublished})
      RETURNING id
    `;
    return rows[0].id;
  }

  // Charge l'URL d'affichage comme le ferait l'iframe : sans en-tête Authorization
  async function render(url) {
    const response = await fetch(`${app.baseUrl.replace(/\/api$/, '')}${url}`);
    return { status: response.status, csp: response.headers.get('content-security-policy'), text: await response.text() };
  }

  beforeAll(async () => {
    app = await startApp();
    await ensureFamilyGate();

    const parent = await createTestProfile({ name: 'Vue Parent', type: 'admin', is_admin: true, is_child: false });
    const childA = await createTestProfile({ name: 'Vue Enfant A', type: 'child' });
    const childB = await createTestProfile({ name: 'Vue Enfant B', type: 'child' });
    ids.parent = parent.id;
    ids.A = childA.id;
    ids.B = childB.id;
    profileIds.push(parent.id, childA.id, childB.id);

    tokens.admin = await currentProfileToken(parent);
    tokens.childA = await currentProfileToken(childA);
    tokens.childB = await currentProfileToken(childB);
    tokens.family = await currentFamilyToken();

    ids.pageA = await insertCoursePage('Page A', ids.A);
    ids.pageDraftA = await insertCoursePage('Brouillon A', ids.A, false);
  }, 30000);

  afterAll(async () => {
    clearPreviews();
    await sql`DELETE FROM course_pages WHERE id = ANY(${[ids.pageA, ids.pageDraftA]})`;
    await cleanupTestData(profileIds, []);
    await app.close();
  });

  describe('POST /course-pages/:id/view', () => {
    test('l\'enfant ciblé, le jeton famille et le parent obtiennent une URL qui sert la page isolée', async () => {
      for (const actor of ['childA', 'family', 'admin']) {
        const { status, body } = await app.call('POST', `/course-pages/${ids.pageA}/view`, { token: tokens[actor] });
        expect(status).toBe(200);
        expect(body.data.url).toMatch(/^\/api\/course-pages\/render\?t=/);
        expect(body.data.expiresIn).toBe(300);

        const page = await render(body.data.url);
        expect(page.status).toBe(200);
        expect(page.csp).toBe(COURSE_PAGE_CSP);
        expect(page.text).toContain('<h1>Page A</h1>');
        expect(page.text).toContain('teachdigital:quiz-progress');
      }
    });

    test('un autre enfant ne peut pas ouvrir la page (404, existence non révélée)', async () => {
      const { status } = await app.call('POST', `/course-pages/${ids.pageA}/view`, { token: tokens.childB });
      expect(status).toBe(404);
    });

    test('un brouillon n\'est visible que du parent', async () => {
      expect((await app.call('POST', `/course-pages/${ids.pageDraftA}/view`, { token: tokens.childA })).status).toBe(404);
      expect((await app.call('POST', `/course-pages/${ids.pageDraftA}/view`, { token: tokens.family })).status).toBe(404);
      expect((await app.call('POST', `/course-pages/${ids.pageDraftA}/view`, { token: tokens.admin })).status).toBe(200);
    });

    test('sans jeton : 401', async () => {
      expect((await app.call('POST', `/course-pages/${ids.pageA}/view`)).status).toBe(401);
    });

    test('page dépubliée après l\'ouverture : plus servie à l\'enfant, toujours au parent', async () => {
      const pageId = await insertCoursePage('Page bientôt masquée', ids.A);
      try {
        const forChild = await app.call('POST', `/course-pages/${pageId}/view`, { token: tokens.childA });
        const forParent = await app.call('POST', `/course-pages/${pageId}/view`, { token: tokens.admin });
        await sql`UPDATE course_pages SET is_published = false WHERE id = ${pageId}`;

        expect((await render(forChild.body.data.url)).status).toBe(404);
        expect((await render(forParent.body.data.url)).status).toBe(200);
      } finally {
        await sql`DELETE FROM course_pages WHERE id = ${pageId}`;
      }
    });
  });

  describe('POST /course-pages/preview', () => {
    test('le parent prévisualise un brouillon non enregistré', async () => {
      const { status, body } = await app.call('POST', '/course-pages/preview', {
        token: tokens.admin,
        body: { htmlContent: '<p>Brouillon généré</p>' }
      });
      expect(status).toBe(200);
      const page = await render(body.data.url);
      expect(page.status).toBe(200);
      expect(page.csp).toBe(COURSE_PAGE_CSP);
      expect(page.text).toMatch(/^<p>Brouillon généré<\/p><script>/);
    });

    test('réservé aux parents', async () => {
      for (const actor of ['childA', 'family']) {
        const { status } = await app.call('POST', '/course-pages/preview', { token: tokens[actor], body: { htmlContent: '<p>x</p>' } });
        expect(status).toBe(403);
      }
    });

    test('contenu vide : 400', async () => {
      const { status, body } = await app.call('POST', '/course-pages/preview', { token: tokens.admin, body: { htmlContent: '' } });
      expect(status).toBe(400);
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /course-pages/render', () => {
    test('un jeton d\'API n\'ouvre pas une page', async () => {
      const page = await render(`/api/course-pages/render?t=${encodeURIComponent(tokens.admin)}`);
      expect(page.status).toBe(401);
      expect(page.text).not.toContain('Page A');
    });

    test('jeton absent : 400', async () => {
      const page = await render('/api/course-pages/render');
      expect(page.status).toBe(400);
    });
  });
});
