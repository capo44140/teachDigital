/**
 * Section « Jeux » (lib/games.js) : règles d'accès fixées par un parent, conditions
 * évaluées à partir des quiz, temps de jeu restant ; validation des règles (lib/schemas.js).
 */
const {
  GAME_KEYS,
  GAME_CONDITION_TYPES,
  DEFAULT_RULE,
  findGame,
  normalizeRule,
  evaluateCondition,
  evaluateGameAccess,
  listConditionTypes
} = require('../../lib/games.js');
const { gameRuleUpdateSchema, gameSessionUpdateSchema, gameListQuerySchema } = require('../../lib/schemas.js');
const { startOfDay, startOfWeekMonday } = require('../../lib/streaks.js');

const NO_ACTIVITY = { quizzesToday: 0, quizzesThisWeek: 0, averageScoreThisWeek: 0, currentStreak: 0 };
const openRule = (overrides = {}) => ({ ...DEFAULT_RULE, isEnabled: true, ...overrides });

describe('catalogue', () => {
  test('Pac-Man et Tetris', () => {
    expect(GAME_KEYS).toEqual(['pacman', 'tetris']);
    expect(findGame('tetris').title).toBe('Tetris');
    expect(findGame('inconnu')).toBeNull();
  });

  test('conditions exposées au client avec leurs bornes', () => {
    const types = listConditionTypes();
    expect(types.map(t => t.type)).toEqual(GAME_CONDITION_TYPES);
    expect(types.find(t => t.type === 'average_score_week')).toEqual(
      expect.objectContaining({ unit: '%', min: 1, max: 100 })
    );
    // La phrase d'affichage reste côté serveur
    expect(types[0].describe).toBeUndefined();
  });
});

describe('normalizeRule', () => {
  test('aucune règle enregistrée : jeu fermé', () => {
    expect(normalizeRule(undefined)).toEqual(DEFAULT_RULE);
  });

  test('ligne de la base convertie', () => {
    expect(normalizeRule({
      is_enabled: true,
      condition_type: 'quizzes_today',
      condition_value: '2',
      daily_limit_minutes: 30
    })).toEqual({ isEnabled: true, conditionType: 'quizzes_today', conditionValue: 2, dailyLimitMinutes: 30 });
  });

  test('condition inconnue en base : traitée comme « sans condition »', () => {
    expect(normalizeRule({ is_enabled: true, condition_type: 'retiree', condition_value: 4, daily_limit_minutes: null }))
      .toEqual({ isEnabled: true, conditionType: 'none', conditionValue: 0, dailyLimitMinutes: null });
  });
});

describe('evaluateCondition', () => {
  test.each([
    ['quizzes_today', 2, { quizzesToday: 2 }, 2, true],
    ['quizzes_today', 2, { quizzesToday: 1 }, 1, false],
    ['quizzes_week', 5, { quizzesThisWeek: 6 }, 6, true],
    ['daily_streak', 3, { currentStreak: 2 }, 2, false],
    ['average_score_week', 70, { quizzesThisWeek: 3, averageScoreThisWeek: 72.6 }, 73, true],
    ['average_score_week', 80, { quizzesThisWeek: 3, averageScoreThisWeek: 72.6 }, 73, false]
  ])('%s ≥ %i', (conditionType, conditionValue, stats, current, met) => {
    const result = evaluateCondition(openRule({ conditionType, conditionValue }), { ...NO_ACTIVITY, ...stats });
    expect(result).toMatchObject({ type: conditionType, target: conditionValue, current, met });
  });

  test('moyenne sans aucun quiz cette semaine : non remplie', () => {
    const result = evaluateCondition(openRule({ conditionType: 'average_score_week', conditionValue: 1 }), NO_ACTIVITY);
    expect(result.met).toBe(false);
  });

  test('phrases pour l\'enfant (accord du pluriel)', () => {
    expect(evaluateCondition(openRule({ conditionType: 'quizzes_today', conditionValue: 2 }), NO_ACTIVITY).label)
      .toBe('Terminer 2 quiz aujourd\'hui');
    expect(evaluateCondition(openRule({ conditionType: 'daily_streak', conditionValue: 1 }), NO_ACTIVITY).label)
      .toBe('Faire au moins un quiz 1 jour de suite');
    expect(evaluateCondition(openRule({ conditionType: 'daily_streak', conditionValue: 3 }), NO_ACTIVITY).label)
      .toBe('Faire au moins un quiz 3 jours de suite');
  });
});

describe('evaluateGameAccess', () => {
  test('jeu fermé par défaut', () => {
    const access = evaluateGameAccess(DEFAULT_RULE, NO_ACTIVITY, 0);
    expect(access).toMatchObject({ unlocked: false, reason: 'disabled' });
    expect(access.message).toMatch(/demande à tes parents/);
  });

  test('ouvert sans condition ni limite', () => {
    expect(evaluateGameAccess(openRule(), NO_ACTIVITY, 5000)).toMatchObject({
      unlocked: true,
      reason: null,
      message: null,
      remainingSeconds: null,
      usedSecondsToday: 5000
    });
  });

  test('condition non remplie : message avec la condition', () => {
    const access = evaluateGameAccess(openRule({ conditionType: 'quizzes_today', conditionValue: 2 }), NO_ACTIVITY, 0);
    expect(access).toMatchObject({ unlocked: false, reason: 'condition' });
    expect(access.message).toBe('Pour jouer : terminer 2 quiz aujourd\'hui.');
  });

  test('temps restant décompté, puis épuisé', () => {
    const rule = openRule({ dailyLimitMinutes: 20 });
    expect(evaluateGameAccess(rule, NO_ACTIVITY, 300)).toMatchObject({ unlocked: true, remainingSeconds: 900 });
    const spent = evaluateGameAccess(rule, NO_ACTIVITY, 1300);
    expect(spent).toMatchObject({ unlocked: false, reason: 'time_limit', remainingSeconds: 0 });
    expect(spent.message).toMatch(/Reviens demain/);
  });

  test('ordre des verrous : fermé, puis condition, puis temps', () => {
    const rule = { isEnabled: false, conditionType: 'quizzes_today', conditionValue: 1, dailyLimitMinutes: 1 };
    expect(evaluateGameAccess(rule, NO_ACTIVITY, 600).reason).toBe('disabled');
    expect(evaluateGameAccess({ ...rule, isEnabled: true }, NO_ACTIVITY, 600).reason).toBe('condition');
    expect(evaluateGameAccess({ ...rule, isEnabled: true }, { ...NO_ACTIVITY, quizzesToday: 1 }, 600).reason).toBe('time_limit');
  });
});

describe('gameRuleUpdateSchema', () => {
  test('camelCase accepté, valeurs par défaut', () => {
    expect(gameRuleUpdateSchema.parse({ isEnabled: true })).toEqual({
      is_enabled: true,
      condition_type: 'none',
      condition_value: 0,
      daily_limit_minutes: null
    });
  });

  test('règle complète', () => {
    expect(gameRuleUpdateSchema.parse({
      isEnabled: 'true',
      conditionType: 'quizzes_week',
      conditionValue: '5',
      dailyLimitMinutes: '30'
    })).toEqual({ is_enabled: true, condition_type: 'quizzes_week', condition_value: 5, daily_limit_minutes: 30 });
  });

  test('« sans condition » : valeur remise à 0', () => {
    expect(gameRuleUpdateSchema.parse({ isEnabled: true, conditionType: 'none', conditionValue: 12 }).condition_value).toBe(0);
  });

  test('durée vide = sans limite', () => {
    expect(gameRuleUpdateSchema.parse({ dailyLimitMinutes: '' }).daily_limit_minutes).toBeNull();
  });

  test.each([
    [{ conditionType: 'inconnue' }, /Condition d'accès inconnue/],
    [{ conditionType: 'quizzes_today', conditionValue: 0 }, /entre 1 et 20/],
    [{ conditionType: 'average_score_week', conditionValue: 101 }, /entre 1 et 100/],
    [{ dailyLimitMinutes: 0 }, /entre 1 et 240 minutes/],
    [{ dailyLimitMinutes: 241 }, /entre 1 et 240 minutes/]
  ])('refuse %j', (body, message) => {
    const result = gameRuleUpdateSchema.safeParse(body);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(message);
  });
});

describe('autres schémas des jeux', () => {
  test('signal de vie : score et fin par défaut', () => {
    expect(gameSessionUpdateSchema.parse({})).toEqual({ score: 0, ended: false, idle: false });
    expect(gameSessionUpdateSchema.safeParse({ score: -1 }).success).toBe(false);
  });

  test('liste : profileId obligatoire', () => {
    expect(gameListQuerySchema.parse({ profileId: '7' })).toEqual({ profileId: 7 });
    expect(gameListQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe('bornes de jour et de semaine', () => {
  test('début du jour et lundi de la semaine (heure locale)', () => {
    const friday = new Date(2026, 9, 23, 10, 30);
    expect(startOfDay(friday)).toEqual(new Date(2026, 9, 23, 0, 0, 0, 0));
    expect(startOfWeekMonday(friday)).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
    // Dimanche : la semaine a commencé six jours plus tôt
    expect(startOfWeekMonday(new Date(2026, 9, 25, 23, 0))).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
  });
});
