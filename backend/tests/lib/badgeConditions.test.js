/**
 * Critères de badges : seuls les critères évaluables peuvent être créés
 */
const { getConditionSupport, SUPPORTED_CONDITION_TYPES } = require('../../lib/badgeConditions.js');
const { badgeCreateSchema, badgeUpdateSchema } = require('../../lib/schemas.js');

const BADGE = {
  name: 'Assidu',
  description: 'Complète 10 quiz',
  icon: 'star',
  category: 'progression',
  condition_type: 'quiz_completed',
  condition_value: 10,
  points: 20,
  color: '#3B82F6'
};

describe('badgeConditions', () => {
  test('chaque critère évalué par le service est accepté', () => {
    for (const conditionType of SUPPORTED_CONDITION_TYPES) {
      expect(getConditionSupport(conditionType)).toEqual({ supported: true });
      expect(badgeCreateSchema.safeParse({ ...BADGE, condition_type: conditionType }).success).toBe(true);
    }
  });

  test('learning_time (aucune donnée de temps) : refusé avec le motif', () => {
    const result = badgeCreateSchema.safeParse({ ...BADGE, condition_type: 'learning_time' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/temps passé/);
    expect(badgeUpdateSchema.safeParse({ condition_type: 'learning_time' }).success).toBe(false);
  });

  test('critère inconnu : refusé', () => {
    expect(badgeCreateSchema.safeParse({ ...BADGE, condition_type: 'inconnu' }).success).toBe(false);
    expect(getConditionSupport('inconnu').supported).toBe(false);
  });
});
