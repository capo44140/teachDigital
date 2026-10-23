/**
 * Sécurité de bout en bout (routeur Express réel + base de test dédiée) :
 * connexion derrière le code familial, politique des PIN, révocation des jetons,
 * verrouillage par IP, score de quiz recalculé, journal d'audit, validation Zod.
 */

jest.mock('../../api/ai/index.js', () => (req, res) => res.status(200).json({ success: true }));

const jwt = require('jsonwebtoken');
const {
  describeWithDb,
  createTestProfile,
  createTestPin,
  cleanupTestData
} = require('../helpers/testHelpers.js');
const { default: sql } = require('../../lib/database.js');
const { NativeHashService } = require('../../lib/nativeHash.js');
const { generateFamilyToken } = require('../../lib/auth.js');
const { pinFailures, familyGateFailures } = require('../../lib/bruteForce.js');
const { startApp } = require('./support/app.js');
const { ensureFamilyGate, currentFamilyToken, currentProfileToken } = require('./support/fixtures.js');

const FAMILY_PIN = '4826';
const QUIZ = {
  title: 'Tables',
  questions: [
    { question: '2 x 3 ?', options: ['5', '6', '7', '8'], correctAnswer: 1 },
    { question: '4 x 4 ?', options: ['16', '12', '18', '20'], correctAnswer: 0 },
    { question: '5 x 2 ?', options: ['7', '12', '10', '9'], correctAnswer: 2 },
    { question: '3 x 3 ?', options: ['6', '9', '12', '3'], correctAnswer: 1 }
  ]
};

let ipCounter = 0;
// Une IP différente par scénario : les limites de débit et verrouillages restent indépendants
const freshIp = () => `10.20.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

describeWithDb('Sécurité de bout en bout', () => {
  let app;
  let parent;
  let parent2;
  let child;
  let otherChild;
  const profileIds = [];
  const lessonIds = [];

  async function freshFamilyToken() {
    return currentFamilyToken();
  }

  beforeAll(async () => {
    app = await startApp();
    // Code familial connu pour ces tests (les autres suites n'en dépendent pas)
    const hash = await NativeHashService.hashPin(FAMILY_PIN);
    await ensureFamilyGate(FAMILY_PIN);
    await sql`UPDATE family_gate SET pin_hash = ${hash} WHERE id = 1`;

    parent = await createTestProfile({ name: 'Sec Parent', type: 'admin', is_admin: true, is_child: false });
    parent2 = await createTestProfile({ name: 'Sec Parent 2', type: 'admin', is_admin: true, is_child: false });
    child = await createTestProfile({ name: 'Sec Enfant', type: 'child' });
    otherChild = await createTestProfile({ name: 'Sec Autre Enfant', type: 'child' });
    profileIds.push(parent.id, parent2.id, child.id, otherChild.id);
    await createTestPin(parent.id, '482613');
    await createTestPin(parent2.id, '739182');
    await createTestPin(child.id, '1357');
    await createTestPin(otherChild.id, '2468');
  }, 30000);

  beforeEach(() => {
    pinFailures.reset();
    familyGateFailures.reset();
  });

  afterAll(async () => {
    await sql`DELETE FROM audit_logs WHERE user_id = ANY(${profileIds})`;
    await cleanupTestData(profileIds, lessonIds);
    await app.close();
  });

  describe('Connexion derrière le code familial', () => {
    it('POST /auth/login sans jeton : 401', async () => {
      const { status, body } = await app.call('POST', '/auth/login', { body: { profileId: child.id, pin: '1357' }, ip: freshIp() });
      expect(status).toBe(401);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('code familial -> jeton famille -> connexion au profil', async () => {
      const ip = freshIp();
      const gate = await app.call('POST', '/auth/family-gate', { body: { pin: FAMILY_PIN }, ip });
      expect(gate.status).toBe(200);

      const { status, body } = await app.call('POST', '/auth/login', {
        token: gate.body.data.token,
        body: { profileId: child.id, pin: '1357' },
        ip
      });
      expect(status).toBe(200);
      expect(body.data.profile.id).toBe(child.id);
      expect(jwt.decode(body.data.token)).toMatchObject({ scope: 'profile', profileId: child.id, tokenVersion: 0 });

      // Journalisation non bloquante : laisser l'insertion se terminer
      await new Promise(resolve => setTimeout(resolve, 100));
      const logs =await sql`SELECT action FROM audit_logs WHERE user_id = ${child.id} AND action = 'LOGIN_SUCCESS'`;
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('journalise côté serveur les échecs du code familial', async () => {
      const before = await sql`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'FAMILY_GATE_FAILED'`;
      const { status } = await app.call('POST', '/auth/family-gate', { body: { pin: '9999' }, ip: freshIp() });
      expect(status).toBe(401);
      await new Promise(resolve => setTimeout(resolve, 100));
      const after = await sql`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'FAMILY_GATE_FAILED'`;
      expect(after[0].n).toBe(before[0].n + 1);
    });
  });

  describe('Verrouillage des PIN', () => {
    it('verrouille par IP : l\'IP fautive est bloquée, une autre IP peut se connecter', async () => {
      const family = await freshFamilyToken();
      const attackerIp = freshIp();
      for (let i = 0; i < 10; i++) {
        const { status } = await app.call('POST', '/auth/login', { token: family, body: { profileId: otherChild.id, pin: '9753' }, ip: attackerIp });
        expect(status).toBe(401);
      }
      const locked = await app.call('POST', '/auth/login', { token: family, body: { profileId: otherChild.id, pin: '2468' }, ip: attackerIp });
      expect(locked.status).toBe(429);
      expect(locked.body.code).toBe('PIN_LOCKED');
      expect(locked.body.retryAfterSeconds).toBeGreaterThan(14 * 60);

      const legit = await app.call('POST', '/auth/login', { token: family, body: { profileId: otherChild.id, pin: '2468' }, ip: freshIp() });
      expect(legit.status).toBe(200);
    });

    it('compteur partagé avec POST /profiles/:id/pin', async () => {
      const family = await freshFamilyToken();
      const ip = freshIp();
      for (let i = 0; i < 5; i++) {
        await app.call('POST', '/auth/login', { token: family, body: { profileId: otherChild.id, pin: '9753' }, ip });
      }
      for (let i = 0; i < 5; i++) {
        const { body } = await app.call('POST', `/profiles/${otherChild.id}/pin`, { token: family, body: { pin: '9753' }, ip });
        expect(body.data.isValid).toBe(false);
      }
      const locked = await app.call('POST', '/auth/login', { token: family, body: { profileId: otherChild.id, pin: '2468' }, ip });
      expect(locked.status).toBe(429);
    });

    it('verrouiller le PIN d\'un parent crée une notification pour les parents', async () => {
      const family = await freshFamilyToken();
      const ip = freshIp();
      for (let i = 0; i < 10; i++) {
        await app.call('POST', '/auth/login', { token: family, body: { profileId: parent.id, pin: '000000' }, ip });
      }
      await new Promise(resolve => setTimeout(resolve, 200));

      const notifications = await sql`
        SELECT profile_id FROM notifications
        WHERE type = 'security_alert' AND profile_id = ANY(${[parent.id, parent2.id]})
      `;
      expect(notifications.map(n => n.profile_id).sort()).toEqual([parent.id, parent2.id].sort());
      const audit = await sql`SELECT details FROM audit_logs WHERE action = 'PIN_LOCKED' AND user_id = ${parent.id}`;
      expect(audit.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Changement de PIN', () => {
    it('refuse un PIN trivial (WEAK_PIN) et un PIN parent trop court (PIN_TOO_SHORT)', async () => {
      const adminToken = await currentProfileToken(parent);

      const weak = await app.call('PUT', `/profiles/${child.id}/pin`, { token: adminToken, body: { newPin: '1234' } });
      expect(weak.status).toBe(400);
      expect(weak.body.code).toBe('WEAK_PIN');
      expect(weak.body.message).toMatch(/trop facile/);

      const short = await app.call('PUT', `/profiles/${parent2.id}/pin`, { token: adminToken, body: { newPin: '4826' } });
      expect(short.status).toBe(400);
      expect(short.body.code).toBe('PIN_TOO_SHORT');
      expect(short.body.message).toMatch(/6 chiffres/);
    });

    it('la connexion accepte toujours un PIN existant trivial', async () => {
      const weakChild = await createTestProfile({ name: 'Sec Enfant PIN faible', type: 'child' });
      profileIds.push(weakChild.id);
      await createTestPin(weakChild.id, '1234');
      const { status } = await app.call('POST', '/auth/login', { token: await freshFamilyToken(), body: { profileId: weakChild.id, pin: '1234' }, ip: freshIp() });
      expect(status).toBe(200);
    });

    it('réinitialise le PIN d\'un enfant : une seule ligne, anciens jetons révoqués', async () => {
      const adminToken = await currentProfileToken(parent);
      const oldChildToken = await currentProfileToken(child);
      expect((await app.call('GET', '/auth/verify', { token: oldChildToken })).status).toBe(200);

      const { status, body } = await app.call('PUT', `/profiles/${child.id}/pin`, { token: adminToken, body: { newPin: '8642' } });
      expect(status).toBe(200);
      expect(body.data.profileId).toBe(child.id);
      expect(body.data.token).toBeUndefined();

      const pins = await sql`SELECT id FROM pin_codes WHERE profile_id = ${child.id}`;
      expect(pins).toHaveLength(1);

      const revoked = await app.call('GET', `/profiles/${child.id}/stats`, { token: oldChildToken });
      expect(revoked.status).toBe(401);
      expect(revoked.body.code).toBe('TOKEN_REVOKED');

      const relogin = await app.call('POST', '/auth/login', { token: await freshFamilyToken(), body: { profileId: child.id, pin: '8642' }, ip: freshIp() });
      expect(relogin.status).toBe(200);
      expect((await app.call('GET', `/profiles/${child.id}/stats`, { token: relogin.body.data.token })).status).toBe(200);
    });

    it('changer son propre PIN exige le PIN actuel et renvoie un nouveau jeton', async () => {
      const adminToken = await currentProfileToken(parent2);

      const missing = await app.call('PUT', `/profiles/${parent2.id}/pin`, { token: adminToken, body: { newPin: '582039' } });
      expect(missing.status).toBe(400);
      expect(missing.body.code).toBe('CURRENT_PIN_REQUIRED');

      const wrong = await app.call('PUT', `/profiles/${parent2.id}/pin`, { token: adminToken, body: { newPin: '582039', currentPin: '111111' } });
      expect(wrong.status).toBe(401);
      expect(wrong.body.code).toBe('INVALID_CURRENT_PIN');

      const { status, body } = await app.call('PUT', `/profiles/${parent2.id}/pin`, { token: adminToken, body: { newPin: '582039', currentPin: '739182' } });
      expect(status).toBe(200);
      expect(typeof body.data.token).toBe('string');

      expect((await app.call('GET', '/profiles/stats', { token: adminToken })).status).toBe(401);
      expect((await app.call('GET', '/profiles/stats', { token: body.data.token })).status).toBe(200);
    });
  });

  describe('Code familial et révocation', () => {
    it('PUT /auth/family-gate incrémente la version : les anciens jetons famille sont refusés', async () => {
      const adminToken = await currentProfileToken(parent);
      const oldFamilyToken = await freshFamilyToken();
      expect((await app.call('GET', '/lessons', { token: oldFamilyToken })).status).toBe(200);
      const [{ token_version: before }] = await sql`SELECT token_version FROM family_gate WHERE id = 1`;

      const weak = await app.call('PUT', '/auth/family-gate', { token: adminToken, body: { newPin: '0000', currentPin: FAMILY_PIN } });
      expect(weak.status).toBe(400);
      expect(weak.body.code).toBe('WEAK_PIN');

      const { status, body } = await app.call('PUT', '/auth/family-gate', { token: adminToken, body: { newPin: '5917', currentPin: FAMILY_PIN } });
      expect(status).toBe(200);
      const [{ token_version: after }] = await sql`SELECT token_version FROM family_gate WHERE id = 1`;
      expect(after).toBe(before + 1);

      const rejected = await app.call('GET', '/lessons', { token: oldFamilyToken });
      expect(rejected.status).toBe(401);
      expect(rejected.body.code).toBe('TOKEN_REVOKED');

      // Nouveau jeton famille fourni à l'appareil du parent
      expect(jwt.decode(body.data.token)).toMatchObject({ scope: 'family', tokenVersion: after });
      expect((await app.call('GET', '/lessons', { token: body.data.token })).status).toBe(200);

      // Remettre le code connu des autres scénarios
      const restore = await app.call('PUT', '/auth/family-gate', { token: adminToken, body: { newPin: FAMILY_PIN, currentPin: '5917' } });
      expect(restore.status).toBe(200);
    });

    it('un jeton sans version (émis avant la migration) vaut la version 0', async () => {
      const legacy = jwt.sign({ scope: 'profile', profileId: otherChild.id, isAdmin: false }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
      expect((await app.call('GET', `/profiles/${otherChild.id}/stats`, { token: legacy })).status).toBe(200);
    });
  });

  describe('Profils : type, désactivation, image', () => {
    it('POST /profiles déduit is_admin / is_child / is_teen du type', async () => {
      const adminToken = await currentProfileToken(parent);
      const { status, body } = await app.call('POST', '/profiles', {
        token: adminToken,
        body: { name: 'Sec Ado', type: 'teen', is_admin: true }
      });
      expect(status).toBe(201);
      profileIds.push(body.data.profile.id);
      expect(body.data.profile).toMatchObject({ type: 'teen', is_admin: false, is_child: false, is_teen: true });
    });

    it('PUT /profiles/:id : changer le type recalcule les indicateurs et révoque les jetons', async () => {
      const adminToken = await currentProfileToken(parent);
      const teen = await createTestProfile({ name: 'Sec Futur Parent', type: 'child' });
      profileIds.push(teen.id);
      const teenToken = await currentProfileToken(teen);

      const { status, body } = await app.call('PUT', `/profiles/${teen.id}`, { token: adminToken, body: { type: 'admin' } });
      expect(status).toBe(200);
      expect(body.data.profile).toMatchObject({ type: 'admin', is_admin: true, is_child: false, is_teen: false });
      expect(body.data.profile.token_version).toBeUndefined();
      expect((await app.call('GET', '/lessons', { token: teenToken })).status).toBe(401);
    });

    it('désactiver un profil révoque ses jetons', async () => {
      const adminToken = await currentProfileToken(parent);
      const temp = await createTestProfile({ name: 'Sec Désactivé', type: 'child' });
      profileIds.push(temp.id);
      const tempToken = await currentProfileToken(temp);
      expect((await app.call('GET', '/lessons', { token: tempToken })).status).toBe(200);

      expect((await app.call('PUT', `/profiles/${temp.id}`, { token: adminToken, body: { is_active: false } })).status).toBe(200);
      const rejected = await app.call('GET', '/lessons', { token: tempToken });
      expect(rejected.status).toBe(401);
      expect(rejected.body.code).toBe('TOKEN_REVOKED');
    });

    it('borne la taille de image_data', async () => {
      const adminToken = await currentProfileToken(parent);
      const { status, body } = await app.call('PUT', `/profiles/${otherChild.id}`, {
        token: adminToken,
        body: { image_data: 'a'.repeat(2 * 1024 * 1024 + 1) }
      });
      expect(status).toBe(400);
      expect(body.message).toMatch(/Image trop volumineuse/);
    });
  });

  describe('Score de quiz recalculé par le serveur', () => {
    let lessonId;
    let draftId;

    beforeAll(async () => {
      const rows = await sql`
        INSERT INTO lessons (profile_id, title, quiz_data, is_published, target_profile_id)
        VALUES (${parent.id}, 'Quiz sécurité', ${JSON.stringify(QUIZ)}::jsonb, true, ${otherChild.id})
        RETURNING id
      `;
      lessonId = rows[0].id;
      const drafts = await sql`
        INSERT INTO lessons (profile_id, title, quiz_data, is_published, target_profile_id)
        VALUES (${parent.id}, 'Brouillon', ${JSON.stringify(QUIZ)}::jsonb, false, ${otherChild.id})
        RETURNING id
      `;
      draftId = drafts[0].id;
      lessonIds.push(lessonId, draftId);
    });

    it('ignore le score envoyé par le client et notifie les parents', async () => {
      const family = await freshFamilyToken();
      const { status, body } = await app.call('POST', `/lessons/${lessonId}/quiz-results`, {
        token: family,
        body: { profileId: otherChild.id, answers: [1, 0, 0, null], score: 4, totalQuestions: 4, percentage: 100 }
      });
      expect(status).toBe(201);
      expect(body.data).toMatchObject({ score: 2, totalQuestions: 4, percentage: 50 });
      expect(body.data.result).toMatchObject({ score: 2, total_questions: 4, lesson_id: lessonId, profile_id: otherChild.id });

      const notifications = await sql`
        SELECT profile_id, title, message, data FROM notifications
        WHERE type = 'quiz_completed' AND profile_id = ANY(${[parent.id, parent2.id]})
      `;
      expect(notifications.map(n => n.profile_id).sort()).toEqual([parent.id, parent2.id].sort());
      expect(notifications[0].message).toContain('Sec Autre Enfant');
      expect(notifications[0].message).toContain('2/4');
      expect(notifications[0].data).toMatchObject({ childProfileId: otherChild.id, lessonId, score: 2, totalQuestions: 4, percentage: 50 });

      await new Promise(resolve => setTimeout(resolve, 100));
      const audit = await sql`SELECT details FROM audit_logs WHERE action = 'QUIZ_COMPLETED' AND user_id = ${otherChild.id}`;
      expect(audit.length).toBeGreaterThanOrEqual(1);
      expect(audit[0].details).toMatchObject({ lessonId, score: 2, percentage: 50 });
    });

    it('rejette plus de réponses que de questions et des réponses non entières', async () => {
      const family = await freshFamilyToken();
      const tooMany = await app.call('POST', `/lessons/${lessonId}/quiz-results`, { token: family, body: { profileId: otherChild.id, answers: [1, 0, 2, 1, 0] } });
      expect(tooMany.status).toBe(400);
      const invalid = await app.call('POST', `/lessons/${lessonId}/quiz-results`, { token: family, body: { profileId: otherChild.id, answers: ['B'] } });
      expect(invalid.status).toBe(400);
      expect(invalid.body.code).toBe('VALIDATION_ERROR');
    });

    it('la leçon doit être publiée et destinée au profil', async () => {
      const family = await freshFamilyToken();
      expect((await app.call('POST', `/lessons/${draftId}/quiz-results`, { token: family, body: { profileId: otherChild.id, answers: [1] } })).status).toBe(404);
      expect((await app.call('POST', `/lessons/${lessonId}/quiz-results`, { token: family, body: { profileId: child.id, answers: [1] } })).status).toBe(404);
    });

    it('les bonnes réponses ne sont révélées à un enfant qu\'après l\'enregistrement de ses réponses', async () => {
      const family = await freshFamilyToken();
      const childView = await app.call('GET', `/lessons/${lessonId}`, { token: family });
      expect(childView.status).toBe(200);
      const childQuestions = childView.body.data.lesson.quiz_data.questions;
      expect(childQuestions).toHaveLength(4);
      expect(childQuestions[0]).toEqual({ question: '2 x 3 ?', options: ['5', '6', '7', '8'] });
      expect(JSON.stringify(childView.body)).not.toMatch(/correctAnswer|explanation/);

      const parentView = await app.call('GET', `/lessons/${lessonId}`, { token: await currentProfileToken(parent) });
      expect(parentView.body.data.lesson.quiz_data.questions[0].correctAnswer).toBe(1);

      const saved = await app.call('POST', `/lessons/${lessonId}/quiz-results`, {
        token: family,
        body: { profileId: otherChild.id, answers: [1, 1, 2, null] }
      });
      expect(saved.status).toBe(201);
      expect(saved.body.data.correction).toEqual([
        { correctAnswer: 1, explanation: null },
        { correctAnswer: 0, explanation: null },
        { correctAnswer: 2, explanation: null },
        { correctAnswer: 1, explanation: null }
      ]);
    });
  });

  describe('Ciblage des leçons', () => {
    const lessonBody = { title: 'Ciblage', quizData: QUIZ };

    it('sans enfant ciblé : leçon pour tous les enfants (et non pour le parent créateur)', async () => {
      const admin = await currentProfileToken(parent);
      const { status, body } = await app.call('POST', '/lessons', { token: admin, body: lessonBody });
      expect(status).toBe(201);
      lessonIds.push(body.data.lesson.id);
      expect(body.data.lesson.target_profile_id).toBeNull();
    });

    it('un profil parent ne peut pas être ciblé', async () => {
      const admin = await currentProfileToken(parent);
      const created = await app.call('POST', '/lessons', { token: admin, body: { ...lessonBody, targetProfileId: parent2.id } });
      expect(created.status).toBe(400);

      const ok = await app.call('POST', '/lessons', { token: admin, body: { ...lessonBody, targetProfileId: child.id } });
      lessonIds.push(ok.body.data.lesson.id);
      const updated = await app.call('PUT', `/lessons/${ok.body.data.lesson.id}`, { token: admin, body: { targetProfileId: parent2.id } });
      expect(updated.status).toBe(400);
    });

    it('PUT targetProfileId: null rend la leçon à tous les enfants ; absent la laisse inchangée', async () => {
      const admin = await currentProfileToken(parent);
      const created = await app.call('POST', '/lessons', { token: admin, body: { ...lessonBody, targetProfileId: child.id } });
      const id = created.body.data.lesson.id;
      lessonIds.push(id);

      const unchanged = await app.call('PUT', `/lessons/${id}`, { token: admin, body: { title: 'Renommée' } });
      expect(unchanged.body.data.lesson.target_profile_id).toBe(child.id);

      const forAll = await app.call('PUT', `/lessons/${id}`, { token: admin, body: { targetProfileId: null } });
      expect(forAll.status).toBe(200);
      expect(forAll.body.data.lesson.target_profile_id).toBeNull();
    });
  });

  describe('Journal d\'audit', () => {
    it('POST /audit/logs exige un jeton', async () => {
      const { status } = await app.call('POST', '/audit/logs', { body: { action: 'CLIENT_ERROR', category: 'system' }, ip: freshIp() });
      expect(status).toBe(401);
    });

    it('userId vient du jeton ; userId / ip / user-agent du client sont ignorés', async () => {
      const childToken = await currentProfileToken(otherChild);
      const ip = freshIp();
      const { status, body } = await app.call('POST', '/audit/logs', {
        token: childToken,
        ip,
        body: { action: 'CLIENT_ERROR', category: 'system', level: 'error', userId: parent.id, ipAddress: '1.2.3.4', userAgent: 'faux', details: { message: 'boom' } }
      });
      expect(status).toBe(201);
      const [log] = await sql`SELECT user_id, ip_address, user_agent, details FROM audit_logs WHERE id = ${body.data.log.id}`;
      expect(log.user_id).toBe(otherChild.id);
      expect(log.ip_address).toBe(ip);
      expect(log.user_agent).not.toBe('faux');
      expect(log.details).toEqual({ message: 'boom' });

      const family = await app.call('POST', '/audit/logs', { token: await freshFamilyToken(), ip, body: { action: 'CLIENT_ERROR', category: 'system', userId: parent.id } });
      const [familyLog] = await sql`SELECT user_id FROM audit_logs WHERE id = ${family.body.data.log.id}`;
      expect(familyLog.user_id).toBeNull();
      await sql`DELETE FROM audit_logs WHERE id = ${family.body.data.log.id}`;
    });

    it('refuse une action hors liste blanche (dont les événements journalisés par le serveur)', async () => {
      const token = await currentProfileToken(otherChild);
      for (const action of ['LOGIN_SUCCESS', 'QUIZ_COMPLETED', 'DROP TABLE']) {
        const { status } = await app.call('POST', '/audit/logs', { token, ip: freshIp(), body: { action, category: 'authentication' } });
        expect(status).toBe(400);
      }
    });

    it('tronque les détails volumineux d\'une erreur client', async () => {
      const token = await currentProfileToken(otherChild);
      const { body } = await app.call('POST', '/audit/logs', {
        token,
        ip: freshIp(),
        body: { action: 'CLIENT_ERROR', category: 'system', details: { stack: 'x'.repeat(50000) } }
      });
      const [log] = await sql`SELECT details FROM audit_logs WHERE id = ${body.data.log.id}`;
      expect(log.details.truncated).toBe(true);
      expect(JSON.stringify(log.details).length).toBeLessThanOrEqual(2100);
    });

    it('export CSV échappé (guillemets, formules)', async () => {
      const adminToken = await currentProfileToken(parent);
      await sql`
        INSERT INTO audit_logs (action, user_id, category, level, details, user_agent)
        VALUES ('=HYPERLINK("http://x")', ${parent.id}, 'system', 'info', '{"note":"a \\"cité\\""}'::jsonb, '+cmd|calc')
      `;
      const { status, body } = await app.call('POST', '/audit/export', { token: adminToken, body: { filters: { userId: parent.id, category: 'system' } } });
      expect(status).toBe(200);
      const csv = body.data.export;
      expect(csv.split('\n')[0]).toBe('id,action,user_id,category,level,details,ip_address,user_agent,created_at');
      expect(csv).toContain('"\'=HYPERLINK(""http://x"")"');
      expect(csv).toContain('"\'+cmd|calc"');
      expect(csv).toContain('"{""note"":""a \\""cité\\""""}"');
    });

    it('borne limit et days', async () => {
      const adminToken = await currentProfileToken(parent);
      expect((await app.call('GET', '/audit/logs?limit=100000', { token: adminToken })).status).toBe(400);
      expect((await app.call('GET', '/audit/logs?limit=abc', { token: adminToken })).status).toBe(400);
      expect((await app.call('GET', '/audit/stats?days=99999', { token: adminToken })).status).toBe(400);
      expect((await app.call('GET', '/audit/logs?limit=5', { token: adminToken })).body.data.logs.length).toBeLessThanOrEqual(5);
      expect((await app.call('GET', '/audit/stats?days=30', { token: adminToken })).status).toBe(200);
    });
  });

  describe('Demandes de création de profil', () => {
    it('crée une notification par parent actif', async () => {
      const { status, body } = await app.call('POST', '/profiles/requests', {
        token: await freshFamilyToken(),
        ip: freshIp(),
        body: { name: 'Nouvelle Léa', type: 'teen' }
      });
      expect(status).toBe(201);
      const rows = await sql`
        SELECT profile_id, data FROM notifications
        WHERE type = 'profile_request' AND data->>'requestId' = ${body.data.requestId}
      `;
      const recipients = rows.map(r => r.profile_id);
      expect(recipients).toEqual(expect.arrayContaining([parent.id, parent2.id]));
      expect(rows[0].data).toMatchObject({ requestedName: 'Nouvelle Léa', requestedType: 'teen' });
    });

    it('rejette un nom invalide en 400', async () => {
      const { status, body } = await app.call('POST', '/profiles/requests', {
        token: await freshFamilyToken(),
        ip: freshIp(),
        body: { name: '<script>' }
      });
      expect(status).toBe(400);
      expect(body.message).toMatch(/Nom invalide/);
    });
  });

  describe('Validation Zod : 400 et jamais 500', () => {
    it.each([
      ['POST', '/lessons', { title: 'Sans quiz' }],
      ['POST', '/lessons', { title: 'Mauvais quiz', quizData: { questions: [{ question: 'Q', options: ['a', 'b'], correctAnswer: 5 }] } }],
      ['POST', '/lessons', { title: 'Quiz JSON cassé', quizData: '{pas du json' }],
      ['POST', '/profiles', { name: 'X', type: 'superadmin' }],
      ['POST', '/notifications', { profileId: 'abc', type: 'info', title: 'T', message: 'M' }],
      ['POST', '/activities', { title: 'T', priority: 'urgente' }],
      ['POST', '/youtube-videos', { url: 'https://youtu.be/x', title: 'Sans id' }],
      ['POST', '/badges', { name: 'Incomplet' }],
      ['GET', '/lessons?targetProfileId=abc', undefined],
      ['GET', '/notifications?isRead=peut-etre', undefined],
      ['GET', '/activities?status=inconnu', undefined]
    ])('%s %s', async (method, path, body) => {
      const adminToken = await currentProfileToken(parent);
      const { status, body: response } = await app.call(method, path, { token: adminToken, body });
      expect(status).toBe(400);
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(typeof response.message).toBe('string');
    });

    it('PUT /notifications/:id avec isRead invalide', async () => {
      const [notification] = await sql`
        INSERT INTO notifications (profile_id, type, title, message)
        VALUES (${parent.id}, 'info', 'T', 'M') RETURNING id
      `;
      const adminToken = await currentProfileToken(parent);
      const { status } = await app.call('PUT', `/notifications/${notification.id}`, { token: adminToken, body: { isRead: 'oui' } });
      expect(status).toBe(400);
    });
  });

  it('un jeton forgé (autre secret) est refusé', async () => {
    const forged = jwt.sign({ scope: 'profile', profileId: parent.id, isAdmin: true }, 'autre-secret-de-plus-de-32-caracteres!!');
    expect((await app.call('GET', '/profiles/stats', { token: forged })).status).toBe(401);
  });

  it('un jeton famille d\'une version future ou passée est refusé', async () => {
    const [{ token_version: version }] = await sql`SELECT token_version FROM family_gate WHERE id = 1`;
    expect((await app.call('GET', '/lessons', { token: generateFamilyToken(version + 1).token })).status).toBe(401);
    expect((await app.call('GET', '/lessons', { token: generateFamilyToken(version).token })).status).toBe(200);
  });
});
