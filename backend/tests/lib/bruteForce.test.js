/**
 * Verrouillage après échecs répétés (lib/bruteForce.js) : par (cible, IP), plafond
 * global par cible, durées progressives 15 min -> 1 h -> 24 h.
 */

const { createFailureLimiter, createTargetGuard } = require('../../lib/bruteForce.js');
const { createMockResponse } = require('../helpers/testHelpers.js');

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function failTimes(limiter, key, count, now) {
  let outcome;
  for (let i = 0; i < count; i++) outcome = limiter.recordFailure(key, now);
  return outcome;
}

describe('createFailureLimiter', () => {
  it('verrouille au seuil puis allonge progressivement : 15 min, 1 h, 24 h', () => {
    const limiter = createFailureLimiter({ maxFailures: 3 });
    let now = 1_000_000;

    expect(failTimes(limiter, 'k', 2, now).locked).toBe(false);
    expect(limiter.lockedFor('k', now)).toBe(0);
    const first = limiter.recordFailure('k', now);
    expect(first).toMatchObject({ locked: true, lockMs: 15 * MINUTE, lockCount: 1 });
    expect(limiter.lockedFor('k', now)).toBe(15 * 60);

    now += 15 * MINUTE;
    expect(limiter.lockedFor('k', now)).toBe(0);
    expect(failTimes(limiter, 'k', 3, now)).toMatchObject({ locked: true, lockMs: HOUR, lockCount: 2 });

    now += HOUR;
    expect(failTimes(limiter, 'k', 3, now)).toMatchObject({ locked: true, lockMs: 24 * HOUR, lockCount: 3 });

    now += 24 * HOUR;
    // Plafonné à 24 h
    expect(failTimes(limiter, 'k', 3, now)).toMatchObject({ locked: true, lockMs: 24 * HOUR });
  });

  it('un succès remet la clé à zéro (le verrouillage suivant redevient court)', () => {
    const limiter = createFailureLimiter({ maxFailures: 2 });
    let now = 0;
    failTimes(limiter, 'k', 2, now);
    now += 15 * MINUTE;
    limiter.recordSuccess('k');
    expect(failTimes(limiter, 'k', 2, now)).toMatchObject({ locked: true, lockMs: 15 * MINUTE, lockCount: 1 });
  });

  it('oublie l\'escalade 24 h après la fin du dernier verrouillage', () => {
    const limiter = createFailureLimiter({ maxFailures: 2 });
    let now = 0;
    failTimes(limiter, 'k', 2, now);
    now += 15 * MINUTE + 24 * HOUR;
    expect(failTimes(limiter, 'k', 2, now)).toMatchObject({ lockMs: 15 * MINUTE, lockCount: 1 });
  });

  it('les échecs anciens (hors fenêtre) ne comptent plus', () => {
    const limiter = createFailureLimiter({ maxFailures: 3, windowMs: 10 * MINUTE });
    failTimes(limiter, 'k', 2, 0);
    expect(limiter.recordFailure('k', 11 * MINUTE).locked).toBe(false);
  });
});

describe('createTargetGuard', () => {
  const options = {
    maxFailuresPerIp: 3,
    maxFailuresGlobal: 5,
    code: 'PIN_LOCKED',
    message: 'Trop de codes PIN incorrects pour ce profil.'
  };

  it('verrouille par (cible, IP) : une autre IP peut encore essayer', () => {
    const guard = createTargetGuard(options);
    for (let i = 0; i < 3; i++) guard.recordFailure('profile:1', '10.0.0.1', 0);
    expect(guard.lockedFor('profile:1', '10.0.0.1', 0)).toBeGreaterThan(0);
    expect(guard.lockedFor('profile:1', '10.0.0.2', 0)).toBe(0);
    expect(guard.lockedFor('profile:2', '10.0.0.1', 0)).toBe(0);
  });

  it('plafond global : une attaque répartie sur plusieurs IP finit par verrouiller la cible', () => {
    const guard = createTargetGuard(options);
    const ips = ['10.0.0.1', '10.0.0.2', '10.0.0.3'];
    let outcome;
    for (let i = 0; i < 5; i++) outcome = guard.recordFailure('profile:1', ips[i % ips.length], 0);
    expect(outcome).toMatchObject({ locked: true, scope: 'global' });
    expect(guard.lockedFor('profile:1', '192.168.1.50', 0)).toBeGreaterThan(0);
  });

  it('plafond global : toujours 15 min, sans escalade (il bloque toute la famille)', () => {
    const guard = createTargetGuard({ ...options, maxFailuresPerIp: 1000 });
    let now = 0;
    for (let round = 0; round < 3; round++) {
      let outcome;
      for (let i = 0; i < 5; i++) outcome = guard.recordFailure('family', `10.0.${round}.${i}`, now);
      expect(outcome).toMatchObject({ locked: true, scope: 'global', lockMs: 15 * MINUTE });
      now += 15 * MINUTE;
      expect(guard.lockedFor('family', '10.9.9.9', now)).toBe(0);
    }
  });

  it('rejectIfLocked répond 429 avec le délai et le code', () => {
    const guard = createTargetGuard(options);
    for (let i = 0; i < 3; i++) guard.recordFailure('profile:1', '10.0.0.1');
    const res = createMockResponse();
    expect(guard.rejectIfLocked('profile:1', '10.0.0.1', res)).toBe(true);
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('PIN_LOCKED');
    expect(res.body.retryAfterSeconds).toBeGreaterThan(14 * 60);
    expect(res.body.message).toMatch(/Réessayez dans 15 min/);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
