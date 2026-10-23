/**
 * Notifications générées par le serveur pour les parents (profils admin actifs).
 */
const { pool } = require('./database.js');
const { withQueryTimeout, TIMEOUTS } = require('./queries.js');

/**
 * Insère une notification pour chaque parent actif et renvoie leurs id
 * (liste vide s'il n'y en a aucun). `db` : client d'une transaction (withTransaction)
 * pour que toutes les notifications soient créées ou aucune, sinon le pool.
 */
async function notifyParents(db, { type, title, message, data = null }) {
  const executor = db || pool;
  const { rows: admins } = await withQueryTimeout(
    executor.query('SELECT id FROM profiles WHERE is_admin = true AND is_active = true ORDER BY id ASC'),
    TIMEOUTS.STANDARD,
    'récupération des parents'
  );
  const payload = data === null || data === undefined ? null : JSON.stringify(data);
  for (const admin of admins) {
    await withQueryTimeout(
      executor.query(
        'INSERT INTO notifications (profile_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5::jsonb)',
        [admin.id, type, title, message, payload]
      ),
      TIMEOUTS.STANDARD,
      `création notification ${type}`
    );
  }
  return admins.map(admin => admin.id);
}

// Notification « quiz terminé » envoyée aux parents (auparavant créée par le frontend)
function buildQuizCompletionNotification({ childName, lessonTitle, score, totalQuestions, percentage }) {
  const child = childName || 'Votre enfant';
  const quiz = lessonTitle || 'Quiz';
  let mood;
  let encouragement;
  if (percentage >= 80) {
    mood = 'Excellent travail !';
    encouragement = 'Félicitations !';
  } else if (percentage >= 60) {
    mood = 'Bon travail !';
    encouragement = 'Belle progression.';
  } else {
    mood = 'Continuez vos efforts !';
    encouragement = 'Une révision avant de réessayer peut aider.';
  }
  return {
    type: 'quiz_completed',
    title: `${child} : ${mood}`,
    message: `${child} a obtenu ${score}/${totalQuestions} (${percentage} %) au quiz « ${quiz} ». ${encouragement}`
  };
}

module.exports = {
  notifyParents,
  buildQuizCompletionNotification
};
