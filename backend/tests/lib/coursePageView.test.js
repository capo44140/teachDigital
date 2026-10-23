/**
 * Affichage isolé des pages de cours : jetons d'affichage, aperçus, en-têtes de la réponse
 */
const jwt = require('jsonwebtoken');
const {
  COURSE_PAGE_CSP,
  withProgressBridge,
  createPreview,
  getPreview,
  clearPreviews,
  signViewToken,
  verifyViewToken,
  viewUrl,
  sendCoursePageHtml
} = require('../../lib/coursePageView.js');

function mockResponse() {
  const res = { headers: {}, statusCode: null, body: null };
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.type = () => res;
  res.send = (body) => { res.body = body; return res; };
  return res;
}

describe('coursePageView', () => {
  afterEach(() => clearPreviews());

  describe('jetons d\'affichage', () => {
    test('un jeton de page se vérifie et renvoie la page', () => {
      expect(verifyViewToken(signViewToken({ pageId: 12 }))).toEqual({ pageId: 12, requirePublished: false });
      expect(verifyViewToken(signViewToken({ pageId: 12, requirePublished: true }))).toEqual({ pageId: 12, requirePublished: true });
    });

    test('un jeton d\'aperçu renvoie l\'identifiant d\'aperçu', () => {
      const previewId = createPreview('<p>brouillon</p>');
      expect(verifyViewToken(signViewToken({ previewId }))).toEqual({ previewId });
    });

    test('un jeton d\'API (famille ou profil) n\'est pas un jeton d\'affichage', () => {
      const familyToken = jwt.sign({ scope: 'family' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
      const profileToken = jwt.sign({ scope: 'profile', profileId: 1, isAdmin: true, pageId: 12 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
      expect(verifyViewToken(familyToken)).toBeNull();
      expect(verifyViewToken(profileToken)).toBeNull();
    });

    test('jeton signé avec un autre secret, expiré ou absent : refusé', () => {
      const forged = jwt.sign({ scope: 'course-page-view', pageId: 12 }, 'autre-secret-de-plus-de-32-caracteres!!', { algorithm: 'HS256' });
      const expired = jwt.sign({ scope: 'course-page-view', pageId: 12, exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
      expect(verifyViewToken(forged)).toBeNull();
      expect(verifyViewToken(expired)).toBeNull();
      expect(verifyViewToken('')).toBeNull();
      expect(verifyViewToken(undefined)).toBeNull();
    });

    test('identifiants malformés dans un jeton valide : refusés', () => {
      const sign = payload => jwt.sign({ scope: 'course-page-view', ...payload }, process.env.JWT_SECRET, { algorithm: 'HS256' });
      expect(verifyViewToken(sign({ pageId: '12' }))).toBeNull();
      expect(verifyViewToken(sign({ pageId: -1 }))).toBeNull();
      expect(verifyViewToken(sign({ previewId: '../etc' }))).toBeNull();
    });

    test('l\'URL encode le jeton', () => {
      expect(viewUrl('a.b+c')).toBe('/api/course-pages/render?t=a.b%2Bc');
    });
  });

  describe('aperçus', () => {
    test('expirent après 10 minutes', () => {
      const now = Date.now();
      const id = createPreview('<p>x</p>', now);
      expect(getPreview(id, now + 9 * 60 * 1000)).toBe('<p>x</p>');
      expect(getPreview(id, now + 11 * 60 * 1000)).toBeNull();
    });

    test('contenu vide ou trop volumineux : refusé', () => {
      expect(() => createPreview('  ')).toThrow();
      expect(() => createPreview('x'.repeat(5 * 1024 * 1024 + 1))).toThrow();
    });

    test('au plus 20 aperçus : les plus anciens sont évincés', () => {
      const ids = Array.from({ length: 21 }, (_, i) => createPreview(`<p>${i}</p>`));
      expect(getPreview(ids[0])).toBeNull();
      expect(getPreview(ids[20])).toBe('<p>20</p>');
    });
  });

  describe('réponse HTML', () => {
    test('CSP sandbox sans allow-same-origin et pont de progression avant </body>', () => {
      const res = mockResponse();
      sendCoursePageHtml(res, '<html><body><p>Cours</p></body></html>');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-security-policy']).toBe(COURSE_PAGE_CSP);
      expect(COURSE_PAGE_CSP).toMatch(/^sandbox allow-scripts allow-forms allow-modals;/);
      expect(COURSE_PAGE_CSP).not.toMatch(/allow-same-origin|allow-popups|allow-top-navigation/);
      expect(COURSE_PAGE_CSP).toContain("connect-src 'none'");
      expect(COURSE_PAGE_CSP).toContain("frame-ancestors 'self'");
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toMatch(/<p>Cours<\/p><script>[\s\S]*teachdigital:quiz-progress[\s\S]*<\/script><\/body>/);
    });

    test('page sans </body> : pont ajouté à la fin', () => {
      expect(withProgressBridge('<p>x</p>')).toMatch(/^<p>x<\/p><script>/);
    });
  });
});
