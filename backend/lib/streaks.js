/**
 * Séries de jours d'activité consécutifs (résumé de progression, badge « daily_streak »,
 * conditions d'accès aux jeux) et bornes de jour / semaine.
 * Les jours sont des clés « YYYY-MM-DD » (DATE(completed_at) côté PostgreSQL) ; l'arithmétique
 * se fait sur des numéros de jour calendaires, sans dépendre du fuseau horaire du serveur.
 */

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Clé YYYY-MM-DD d'une date, en heure locale du serveur (« aujourd'hui »)
 * @param {Date|string|number} date
 * @returns {string}
 */
function toDateOnlyKey(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Début du jour (minuit), en heure locale du serveur
 * @param {Date} [date]
 * @returns {Date}
 */
function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Début de la semaine (lundi minuit), en heure locale du serveur
 * @param {Date} [date]
 * @returns {Date}
 */
function startOfWeekMonday(date = new Date()) {
  const d = startOfDay(date);
  // JS: 0=dimanche ... 6=samedi. On veut lundi=0
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

// Numéro de jour calendaire (jours depuis 1970-01-01), ou null si la clé est invalide
function dayKeyToIndex(key) {
  const match = DAY_KEY_PATTERN.exec(String(key || ''));
  if (!match) return null;
  return Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

/**
 * @param {string[]} dayKeys - Jours d'activité (YYYY-MM-DD), dans n'importe quel ordre, doublons tolérés
 * @param {Date} [now] - « Maintenant » (injectable pour les tests)
 * @returns {{current: number, best: number, lastActivityDate: string|null}}
 *   current : série en cours (incluant aujourd'hui, ou se terminant hier) ;
 *   best : plus longue série observée.
 */
function computeStreaksFromDayKeys(dayKeys, now = new Date()) {
  const byIndex = new Map();
  for (const key of Array.isArray(dayKeys) ? dayKeys : []) {
    const index = dayKeyToIndex(key);
    if (index !== null) byIndex.set(index, key);
  }
  if (byIndex.size === 0) {
    return { current: 0, best: 0, lastActivityDate: null };
  }

  const indexes = [...byIndex.keys()].sort((a, b) => b - a);
  const present = new Set(indexes);

  // Série en cours : commence aujourd'hui si activité, sinon hier si activité, sinon 0
  const today = dayKeyToIndex(toDateOnlyKey(now));
  let cursor = present.has(today) ? today : (present.has(today - 1) ? today - 1 : null);
  let current = 0;
  while (cursor !== null && present.has(cursor)) {
    current++;
    cursor--;
  }

  // Meilleure série : plus longue suite de jours consécutifs
  let best = 1;
  let run = 1;
  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] === indexes[i - 1] - 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  return { current, best, lastActivityDate: byIndex.get(indexes[0]) };
}

module.exports = {
  toDateOnlyKey,
  startOfDay,
  startOfWeekMonday,
  computeStreaksFromDayKeys
};
