const { NativeHashService } = require('../lib/nativeHash.js');
const { default: sql } = require('../lib/database.js');
const { generateToken, generateFamilyToken, verifyRequestToken, clearAuthCache } = require('../lib/auth.js');
const { familyGateFailures } = require('../lib/bruteForce.js');
const { rejectIfPinLocked, recordPinSuccess, recordPinFailure, rehashLegacyPin } = require('../lib/pinAttempts.js');
const { checkNewPin } = require('../lib/pinPolicy.js');
const { getClientIp } = require('../lib/rateLimit.js');
const { recordAuditEvent } = require('../lib/auditLog.js');
const { withTransaction } = require('../lib/transaction.js');
const { createErrorResponse } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { sendError, sendFailure } = require('../lib/http.js');

// POST /auth/login : jeton famille ou profil requis (routeur), corps validé par loginSchema
async function handleLogin(req, res) {
    if (req.method !== 'POST') {
        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    }

    try {
        const { profileId, pin } = req.body || {};
        const profileIdNum = parseInt(profileId, 10);
        if (!pin || !Number.isInteger(profileIdNum) || profileIdNum <= 0) {
            return sendFailure(res, 400, 'ID de profil et code PIN requis', 'BAD_REQUEST');
        }

        // Verrouillage par (profil, IP) et plafond global par profil
        if (rejectIfPinLocked(req, res, profileIdNum)) {
            return;
        }

        const [profile, pinData] = await Promise.all([
            withQueryTimeout(
                sql`SELECT id, name, type, is_admin, is_child, is_teen, token_version FROM profiles WHERE id = ${profileIdNum} AND is_active = true`,
                TIMEOUTS.STANDARD,
                'récupération du profil'
            ),
            withQueryTimeout(
                sql`SELECT pin_code FROM pin_codes WHERE profile_id = ${profileIdNum} ORDER BY created_at DESC LIMIT 1`,
                TIMEOUTS.STANDARD,
                'récupération du PIN'
            )
        ]);

        if (!profile[0] || !pinData[0]) {
            recordAuditEvent({ action: 'LOGIN_FAILED', category: 'authentication', level: 'warning', userId: null, details: { profileId: profileIdNum, reason: 'unknown_profile' }, req });
            return sendFailure(res, 401, 'Profil ou code PIN invalide', 'INVALID_CREDENTIALS');
        }

        const isValidPin = await NativeHashService.verifyPin(pin, pinData[0].pin_code);
        if (!isValidPin) {
            recordAuditEvent({ action: 'LOGIN_FAILED', category: 'authentication', level: 'warning', userId: profile[0].id, details: { profileId: profile[0].id, reason: 'wrong_pin' }, req });
            recordPinFailure(req, profile[0]);
            return sendFailure(res, 401, 'Code PIN incorrect', 'INVALID_CREDENTIALS');
        }
        recordPinSuccess(req, profileIdNum);
        rehashLegacyPin(pin, pinData[0].pin_code, profileIdNum);

        const token = generateToken({
            profileId: profile[0].id,
            name: profile[0].name,
            type: profile[0].type,
            isAdmin: profile[0].is_admin,
            tokenVersion: profile[0].token_version
        });

        recordAuditEvent({ action: 'LOGIN_SUCCESS', category: 'authentication', level: 'info', userId: profile[0].id, details: { profileId: profile[0].id, via: req.user?.scope || null }, req });

        res.status(200).json({
            success: true,
            message: 'Connexion réussie',
            data: {
                token,
                profile: {
                    id: profile[0].id,
                    name: profile[0].name,
                    type: profile[0].type,
                    isAdmin: profile[0].is_admin,
                    isChild: profile[0].is_child,
                    isTeen: profile[0].is_teen
                }
            }
        });
    } catch (error) {
        sendError(res, error, 'Erreur lors de la connexion');
    }
}

// POST : vérifier le code familial et délivrer un jeton famille
async function checkFamilyGate(req, res) {
    const { pin } = req.body || {};
    if (!pin) {
        return sendFailure(res, 400, 'Code familial requis', 'BAD_REQUEST');
    }
    const ip = getClientIp(req);
    if (familyGateFailures.rejectIfLocked('family', ip, res)) {
        return;
    }
    const row = await withQueryTimeout(
        sql`SELECT pin_hash, token_version FROM family_gate WHERE id = 1`,
        TIMEOUTS.STANDARD,
        'family_gate'
    );
    if (!row[0]) {
        return sendFailure(res, 503, 'Code d\'entrée familial non configuré', 'FAMILY_GATE_NOT_CONFIGURED');
    }
    const isValid = await NativeHashService.verifyPin(pin, row[0].pin_hash);
    if (!isValid) {
        const outcome = familyGateFailures.recordFailure('family', ip);
        recordAuditEvent({ action: 'FAMILY_GATE_FAILED', category: 'authentication', level: 'warning', details: {}, req });
        if (outcome.locked) {
            recordAuditEvent({
                action: 'FAMILY_GATE_LOCKED',
                category: 'security',
                level: 'warning',
                details: { lockScope: outcome.scope, lockCount: outcome.lockCount, lockMinutes: Math.round(outcome.lockMs / 60000) },
                req
            });
        }
        return sendFailure(res, 401, 'Code incorrect', 'INVALID_CREDENTIALS');
    }
    familyGateFailures.recordSuccess('family', ip);
    if (NativeHashService.needsRehash(row[0].pin_hash)) {
        // « AND pin_hash = ancien hash » : un code changé pendant le hachage n'est pas écrasé
        const legacyHash = row[0].pin_hash;
        NativeHashService.hashPin(pin)
            .then(newHash => sql`UPDATE family_gate SET pin_hash = ${newHash}, updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND pin_hash = ${legacyHash}`)
            .catch(err => console.error('⚠️ Migration bcrypt family_gate échouée (non-bloquant):', err?.message || err));
    }
    recordAuditEvent({ action: 'FAMILY_GATE_SUCCESS', category: 'authentication', level: 'info', details: {}, req });

    // Jeton « famille » : donne l'accès enfant à l'API (pas les droits parent)
    const { token, expiresAt } = generateFamilyToken(row[0].token_version);
    res.status(200).json({
        success: true,
        message: 'Code valide',
        data: { valid: true, token, expiresAt }
    });
}

// PUT : définir ou modifier le code familial (requireAdmin + familyGateUpdateSchema sur la route).
// Incrémente family_gate.token_version : tous les jetons famille existants sont révoqués.
// La réponse contient un nouveau jeton famille pour l'appareil du parent.
async function updateFamilyGate(req, res) {
    const { newPin, currentPin } = req.body || {};
    const policy = checkNewPin(newPin);
    if (!policy.ok) {
        return sendFailure(res, 400, policy.message, policy.code);
    }
    const row = await withQueryTimeout(
        sql`SELECT pin_hash FROM family_gate WHERE id = 1`,
        TIMEOUTS.STANDARD,
        'family_gate'
    );
    if (row[0]) {
        if (!currentPin) {
            return sendFailure(res, 400, 'Code actuel requis pour modifier', 'CURRENT_PIN_REQUIRED');
        }
        const validCurrent = await NativeHashService.verifyPin(currentPin, row[0].pin_hash);
        if (!validCurrent) {
            return sendFailure(res, 401, 'Code actuel incorrect', 'INVALID_CURRENT_PIN');
        }
    }
    const hashedPin = await NativeHashService.hashPin(newPin);
    const tokenVersion = await withTransaction(async (client) => {
        const { rows } = await client.query(
            `INSERT INTO family_gate (id, pin_hash, updated_at)
             VALUES (1, $1, CURRENT_TIMESTAMP)
             ON CONFLICT (id) DO UPDATE SET
               pin_hash = EXCLUDED.pin_hash,
               token_version = family_gate.token_version + 1,
               updated_at = CURRENT_TIMESTAMP
             RETURNING token_version`,
            [hashedPin]
        );
        return rows[0].token_version;
    }, { operation: 'mise à jour du code familial' });
    clearAuthCache('family');

    recordAuditEvent({ action: 'FAMILY_GATE_CHANGED', category: 'security', level: 'info', userId: req.user?.profileId ?? null, details: { tokenVersion }, req });

    const { token, expiresAt } = generateFamilyToken(tokenVersion);
    res.status(200).json({
        success: true,
        message: 'Code d\'entrée familial mis à jour',
        data: { token, expiresAt }
    });
}

// Handler du code d'entrée familial (Option B - code dédié)
async function handleFamilyGate(req, res) {
    try {
        if (req.method === 'POST') return await checkFamilyGate(req, res);
        if (req.method === 'PUT') return await updateFamilyGate(req, res);
        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, req.method === 'PUT' ? 'Erreur mise à jour code familial' : 'Erreur vérification code familial');
    }
}

// Handler de déconnexion
async function handleLogout(req, res) {
    if (req.method !== 'POST') {
        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    }
    // Jetons JWT sans état : la déconnexion consiste à supprimer le jeton côté client.
    // La révocation côté serveur passe par token_version (changement de PIN, désactivation...).
    res.status(200).json({
        success: true,
        message: 'Déconnexion réussie'
    });
}

// Handler de vérification du token (appelé au démarrage de l'application)
// 200 si le token est valide et non révoqué, 401 sinon (le frontend supprime alors le token)
async function handleVerify(req, res) {
    const result = await verifyRequestToken(req);
    if (!result.user) {
        return res.status(result.status).json(createErrorResponse(result.message, result.code));
    }
    const user = result.user;
    res.status(200).json({
        success: true,
        message: 'Token valide',
        data: {
            scope: user.scope,
            user: user.profileId ? {
                id: user.profileId,
                name: user.name,
                type: user.type,
                isAdmin: user.isAdmin === true
            } : null
        }
    });
}

module.exports = {
    handleLogin,
    handleLogout,
    handleVerify,
    handleFamilyGate
};
