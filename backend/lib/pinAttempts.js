/**
 * Suivi des tentatives de PIN de profil, partagé par POST /auth/login et
 * POST /profiles/:id/pin (mêmes PIN, mêmes compteurs de verrouillage).
 */
const { default: sql } = require('./database.js');
const { NativeHashService } = require('./nativeHash.js');
const { pinFailures } = require('./bruteForce.js');
const { getClientIp } = require('./rateLimit.js');
const { recordAuditEvent } = require('./auditLog.js');
const { notifyParents } = require('./notify.js');

function lockTarget(profileId) {
  return `profile:${profileId}`;
}

function formatDuration(minutes) {
  return minutes >= 60 ? `${Math.round(minutes / 60)} h` : `${minutes} min`;
}

// Répond 429 et renvoie true si le PIN de ce profil est verrouillé pour cette IP
function rejectIfPinLocked(req, res, profileId) {
  return pinFailures.rejectIfLocked(lockTarget(profileId), getClientIp(req), res);
}

function recordPinSuccess(req, profileId) {
  pinFailures.recordSuccess(lockTarget(profileId), getClientIp(req));
}

/**
 * Enregistre un PIN incorrect. Si cet échec déclenche un verrouillage, il est
 * journalisé ; pour un profil parent, les parents reçoivent une notification.
 * `profile` : { id, name, is_admin }.
 */
function recordPinFailure(req, profile) {
  const ip = getClientIp(req);
  const outcome = pinFailures.recordFailure(lockTarget(profile.id), ip);
  if (!outcome.locked) return outcome;

  const details = {
    profileId: profile.id,
    lockScope: outcome.scope,
    lockCount: outcome.lockCount,
    lockMinutes: Math.round(outcome.lockMs / 60000)
  };
  recordAuditEvent({ action: 'PIN_LOCKED', category: 'security', level: 'warning', userId: profile.id, details, req });

  if (profile.is_admin === true) {
    notifyParents(null, {
      type: 'security_alert',
      title: 'Code PIN parent verrouillé',
      message: `Trop de codes PIN incorrects ont été saisis pour le profil « ${profile.name} ». ` +
        `Les tentatives sont bloquées pendant ${formatDuration(details.lockMinutes)}. ` +
        'Si ce n\'était pas vous, changez ce code PIN.',
      data: { ...details, ip, lockedAt: new Date().toISOString() }
    }).catch(error => console.error('⚠️ Notification de verrouillage non créée:', error?.message || error));
  }
  return outcome;
}

// Migration transparente bcrypt (non bloquante) si le hash est à l'ancien format.
// « AND pin_code = ancien hash » : un PIN changé pendant le hachage n'est pas écrasé.
function rehashLegacyPin(pin, storedHash, profileId) {
  if (!NativeHashService.needsRehash(storedHash)) return;
  NativeHashService.hashPin(pin)
    .then(newHash => sql`UPDATE pin_codes SET pin_code = ${newHash} WHERE profile_id = ${profileId} AND pin_code = ${storedHash}`)
    .catch(err => console.error('⚠️ Migration bcrypt PIN échouée (non-bloquant):', err?.message || err));
}

module.exports = {
  rejectIfPinLocked,
  recordPinSuccess,
  recordPinFailure,
  rehashLegacyPin
};
