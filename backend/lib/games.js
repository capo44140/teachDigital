/**
 * Section « Jeux » : catalogue des jeux et règles d'accès fixées par un parent, enfant par
 * enfant (sans dépendance à la base : utilisé par la validation des entrées et par le
 * contrôleur des jeux).
 *
 * Un jeu est fermé tant qu'un parent ne l'a pas ouvert. Ouvert, il peut exiger une
 * condition (évaluée par le serveur à partir des quiz terminés) et une durée maximale de
 * jeu par jour (temps compté par le serveur, voir game_sessions).
 */

const GAMES = Object.freeze([
    Object.freeze({
        key: 'pacman',
        title: 'Pac-Man',
        description: 'Mange toutes les pastilles du labyrinthe sans te faire attraper par les fantômes.'
    }),
    Object.freeze({
        key: 'tetris',
        title: 'Tetris',
        description: 'Empile les pièces qui tombent et complète des lignes pour les faire disparaître.'
    }),
    Object.freeze({
        key: 'mario',
        title: 'Mario Bros',
        description: 'Cours, saute sur les ennemis et attrape le drapeau au bout de chaque niveau, comme sur Game Boy.'
    })
]);

const GAME_KEYS = Object.freeze(GAMES.map(game => game.key));

const plural = (count, singular, pluralForm) => (count > 1 ? pluralForm : singular);

// Conditions d'accès : bornes de la valeur cible et phrase affichée à l'enfant
const GAME_CONDITIONS = Object.freeze({
    none: {
        label: 'Sans condition',
        unit: null,
        min: 0,
        max: 0,
        defaultValue: 0,
        describe: () => 'Aucune condition'
    },
    quizzes_today: {
        label: 'Quiz terminés aujourd\'hui',
        unit: 'quiz',
        min: 1,
        max: 20,
        defaultValue: 1,
        describe: value => `Terminer ${value} quiz aujourd'hui`
    },
    quizzes_week: {
        label: 'Quiz terminés cette semaine',
        unit: 'quiz',
        min: 1,
        max: 50,
        defaultValue: 5,
        describe: value => `Terminer ${value} quiz cette semaine`
    },
    average_score_week: {
        label: 'Moyenne des quiz de la semaine',
        unit: '%',
        min: 1,
        max: 100,
        defaultValue: 70,
        describe: value => `Avoir au moins ${value} % de moyenne aux quiz de la semaine`
    },
    daily_streak: {
        label: 'Jours de suite avec un quiz',
        unit: 'jours',
        min: 1,
        max: 30,
        defaultValue: 3,
        describe: value => `Faire au moins un quiz ${value} ${plural(value, 'jour', 'jours')} de suite`
    }
});

const GAME_CONDITION_TYPES = Object.freeze(Object.keys(GAME_CONDITIONS));

// Durée de jeu par jour et par jeu (null : sans limite)
const MIN_DAILY_LIMIT_MINUTES = 1;
const MAX_DAILY_LIMIT_MINUTES = 240;

// Score maximal accepté pour une partie (borne les entrées, pas un plafond de jeu réaliste)
const MAX_GAME_SCORE = 100000000;

// Temps de jeu : chaque signal de vie du client ajoute au plus cet écart. Un onglet mis en
// veille ou fermé sans prévenir ne compte donc pas comme du temps de jeu.
const HEARTBEAT_MAX_GAP_SECONDS = 45;

// Aucune règle enregistrée : jeu fermé
const DEFAULT_RULE = Object.freeze({
    isEnabled: false,
    conditionType: 'none',
    conditionValue: 0,
    dailyLimitMinutes: null
});

function findGame(key) {
    return GAMES.find(game => game.key === key) || null;
}

const toInt = value => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Règle lue en base (snake_case) → règle normalisée, ou règle par défaut
 * @param {object|null|undefined} row
 */
function normalizeRule(row) {
    if (!row) return { ...DEFAULT_RULE };
    const conditionType = GAME_CONDITION_TYPES.includes(row.condition_type) ? row.condition_type : 'none';
    const limit = row.daily_limit_minutes;
    return {
        isEnabled: row.is_enabled === true,
        conditionType,
        conditionValue: conditionType === 'none' ? 0 : toInt(row.condition_value),
        dailyLimitMinutes: limit === null || limit === undefined ? null : toInt(limit)
    };
}

/**
 * Progression de l'enfant vers la condition d'une règle
 * @param {object} rule - règle normalisée
 * @param {{quizzesToday: number, quizzesThisWeek: number, averageScoreThisWeek: number, currentStreak: number}} stats
 * @returns {{type: string, label: string, target: number, current: number, met: boolean}}
 */
function evaluateCondition(rule, stats) {
    const type = rule.conditionType;
    const definition = GAME_CONDITIONS[type] || GAME_CONDITIONS.none;
    const target = type === 'none' ? 0 : rule.conditionValue;

    let current = 0;
    let met = true;
    switch (type) {
        case 'quizzes_today':
            current = stats.quizzesToday;
            met = current >= target;
            break;
        case 'quizzes_week':
            current = stats.quizzesThisWeek;
            met = current >= target;
            break;
        case 'average_score_week':
            // Sans quiz cette semaine, la moyenne n'existe pas : condition non remplie
            current = stats.quizzesThisWeek > 0 ? Math.round(stats.averageScoreThisWeek) : 0;
            met = stats.quizzesThisWeek > 0 && current >= target;
            break;
        case 'daily_streak':
            current = stats.currentStreak;
            met = current >= target;
            break;
        default:
            met = true;
    }

    return { type, label: definition.describe(target), target, current, met };
}

/**
 * Accès d'un enfant à un jeu : ouvert par un parent, condition remplie, temps restant
 * @param {object} rule - règle normalisée
 * @param {object} stats - voir evaluateCondition
 * @param {number} usedSecondsToday - temps déjà joué aujourd'hui à ce jeu
 */
function evaluateGameAccess(rule, stats, usedSecondsToday = 0) {
    const condition = evaluateCondition(rule, stats);
    const used = Math.max(0, toInt(usedSecondsToday));
    const remainingSeconds = rule.dailyLimitMinutes === null
        ? null
        : Math.max(0, rule.dailyLimitMinutes * 60 - used);

    let reason = null;
    if (!rule.isEnabled) {
        reason = 'disabled';
    } else if (!condition.met) {
        reason = 'condition';
    } else if (remainingSeconds !== null && remainingSeconds <= 0) {
        reason = 'time_limit';
    }

    return {
        unlocked: reason === null,
        reason,
        message: describeLock(reason, condition),
        condition,
        dailyLimitMinutes: rule.dailyLimitMinutes,
        usedSecondsToday: used,
        remainingSeconds
    };
}

// Phrase affichée à l'enfant quand le jeu est verrouillé (null s'il est accessible)
function describeLock(reason, condition) {
    switch (reason) {
        case 'disabled':
            return 'Ce jeu n\'est pas encore ouvert : demande à tes parents !';
        case 'condition':
            return `Pour jouer : ${condition.label.charAt(0).toLowerCase()}${condition.label.slice(1)}.`;
        case 'time_limit':
            return 'Tu as utilisé tout ton temps de jeu pour aujourd\'hui. Reviens demain !';
        default:
            return null;
    }
}

// Catalogue des conditions exposé au client (formulaire parent)
function listConditionTypes() {
    return GAME_CONDITION_TYPES.map(type => {
        const { label, unit, min, max, defaultValue } = GAME_CONDITIONS[type];
        return { type, label, unit, min, max, defaultValue };
    });
}

module.exports = {
    GAMES,
    GAME_KEYS,
    GAME_CONDITIONS,
    GAME_CONDITION_TYPES,
    MIN_DAILY_LIMIT_MINUTES,
    MAX_DAILY_LIMIT_MINUTES,
    MAX_GAME_SCORE,
    HEARTBEAT_MAX_GAP_SECONDS,
    DEFAULT_RULE,
    findGame,
    normalizeRule,
    evaluateCondition,
    evaluateGameAccess,
    listConditionTypes
};
