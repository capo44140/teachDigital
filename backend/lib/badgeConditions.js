/**
 * Critères de déblocage des badges (sans dépendance à la base : utilisé par la
 * validation des entrées et par le service des badges).
 */

// Critères évalués automatiquement
const SUPPORTED_CONDITION_TYPES = Object.freeze([
    'quiz_completed',
    'perfect_score',
    'score_streak',
    'subjects_variety',
    'subject_specific',
    'daily_streak'
]);

// Critères connus mais NON évaluables : les données nécessaires n'existent pas.
// Ces badges ne sont jamais débloqués automatiquement (aucune progression n'est enregistrée) ;
// leur création est refusée, le motif est exposé pour l'interface.
const UNSUPPORTED_CONDITION_TYPES = Object.freeze({
    learning_time: 'Le temps passé à apprendre n\'est pas enregistré par l\'application : ce critère ne peut pas être évalué.'
});

/**
 * Le critère d'un badge peut-il être évalué ?
 * @param {string} conditionType
 * @returns {{supported: boolean, reason?: string}}
 */
function getConditionSupport(conditionType) {
    if (SUPPORTED_CONDITION_TYPES.includes(conditionType)) {
        return { supported: true };
    }
    if (Object.prototype.hasOwnProperty.call(UNSUPPORTED_CONDITION_TYPES, conditionType)) {
        return { supported: false, reason: UNSUPPORTED_CONDITION_TYPES[conditionType] };
    }
    return { supported: false, reason: `Type de critère inconnu : ${conditionType}` };
}

module.exports = {
    SUPPORTED_CONDITION_TYPES,
    UNSUPPORTED_CONDITION_TYPES,
    getConditionSupport
};
