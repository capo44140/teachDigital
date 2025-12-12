/**
 * Tests unitaires du middleware de rate limiting
 */

const { createRateLimiter } = require('../../lib/rateLimit.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

describe('RateLimit middleware', () => {
  it('devrait autoriser jusqu’à la limite puis retourner 429', async () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      keyGenerator: (req) => `k:${req.headers['x-forwarded-for'] || 'ip'}`
    });

    const next = jest.fn();

    const req1 = createMockRequest('POST', '/api/auth/login', {}, { 'x-forwarded-for': '1.2.3.4' });
    const res1 = createMockResponse();
    await limiter(req1, res1, next);

    const req2 = createMockRequest('POST', '/api/auth/login', {}, { 'x-forwarded-for': '1.2.3.4' });
    const res2 = createMockResponse();
    await limiter(req2, res2, next);

    const req3 = createMockRequest('POST', '/api/auth/login', {}, { 'x-forwarded-for': '1.2.3.4' });
    const res3 = createMockResponse();
    await limiter(req3, res3, next);

    // next appelé pour les 2 premières requêtes
    expect(next).toHaveBeenCalledTimes(2);

    // 3e requête refusée
    expect(res3.statusCode).toBe(429);
    expect(res3.body).toBeDefined();
    expect(res3.body.success).toBe(false);
    expect(res3.body.code).toBe('RATE_LIMITED');
  });

  it('devrait réautoriser après la fenêtre', async () => {
    jest.useFakeTimers();

    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
      keyGenerator: (req) => `k:${req.headers['x-forwarded-for'] || 'ip'}`
    });

    const next = jest.fn();

    const req1 = createMockRequest('POST', '/api/auth/login', {}, { 'x-forwarded-for': '5.6.7.8' });
    const res1 = createMockResponse();
    await limiter(req1, res1, next);

    const req2 = createMockRequest('POST', '/api/auth/login', {}, { 'x-forwarded-for': '5.6.7.8' });
    const res2 = createMockResponse();
    await limiter(req2, res2, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res2.statusCode).toBe(429);

    // Avancer le temps au-delà de la fenêtre
    jest.advanceTimersByTime(1100);

    const req3 = createMockRequest('POST', '/api/auth/login', {}, { 'x-forwarded-for': '5.6.7.8' });
    const res3 = createMockResponse();
    await limiter(req3, res3, next);

    expect(next).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});


