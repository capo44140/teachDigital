/**
 * Séries de jours consécutifs (lib/streaks.js), partagées par le résumé de progression
 * et le badge daily_streak.
 */

const { computeStreaksFromDayKeys, toDateOnlyKey } = require('../../lib/streaks.js');

// 23 octobre 2026, 10 h, heure locale
const NOW = new Date(2026, 9, 23, 10, 0, 0);

describe('computeStreaksFromDayKeys', () => {
  it('aucune activité', () => {
    expect(computeStreaksFromDayKeys([], NOW)).toEqual({ current: 0, best: 0, lastActivityDate: null });
    expect(computeStreaksFromDayKeys(undefined, NOW)).toEqual({ current: 0, best: 0, lastActivityDate: null });
  });

  it('série en cours incluant aujourd\'hui', () => {
    expect(computeStreaksFromDayKeys(['2026-10-23', '2026-10-22', '2026-10-21', '2026-10-15'], NOW))
      .toEqual({ current: 3, best: 3, lastActivityDate: '2026-10-23' });
  });

  it('série terminée hier : toujours en cours', () => {
    expect(computeStreaksFromDayKeys(['2026-10-22', '2026-10-21'], NOW)).toMatchObject({ current: 2, best: 2 });
  });

  it('dernière activité avant-hier : série en cours à 0, meilleure série conservée', () => {
    expect(computeStreaksFromDayKeys(['2026-10-21', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'], NOW))
      .toEqual({ current: 0, best: 4, lastActivityDate: '2026-10-21' });
  });

  it('ordre quelconque, doublons et clés invalides tolérés', () => {
    expect(computeStreaksFromDayKeys(['2026-10-21', null, '2026-10-23', 'pas-une-date', '2026-10-22', '2026-10-22'], NOW))
      .toEqual({ current: 3, best: 3, lastActivityDate: '2026-10-23' });
  });

  it('traverse les changements de mois et d\'heure (heure d\'hiver le 25 octobre)', () => {
    const now = new Date(2026, 10, 2, 9, 0, 0);
    const keys = ['2026-11-02', '2026-11-01', '2026-10-31', '2026-10-30', '2026-10-29', '2026-10-28', '2026-10-27', '2026-10-26', '2026-10-25', '2026-10-24'];
    expect(computeStreaksFromDayKeys(keys, now)).toMatchObject({ current: 10, best: 10 });
  });

  it('toDateOnlyKey utilise l\'heure locale', () => {
    expect(toDateOnlyKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
