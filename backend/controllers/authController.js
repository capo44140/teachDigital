const { NativeHashService } = require('../lib/nativeHash.js');
const { default: sql } = require('../lib/database.js');
const { generateToken, createSession, deleteSession, authenticateToken } = require('../lib/auth.js');
const { handleError, createErrorResponse } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');

// Handler de connexion
async function handleLogin(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
        return;
    }

    try {
        const { profileId, pin } = req.body;

        if (!profileId || !pin) {
            res.status(400).json({
                success: false,
                message: 'ID de profil et code PIN requis'
            });
            return;
        }

        // Validation et conversion de l'ID
        const profileIdNum = parseInt(profileId, 10);

        if (isNaN(profileIdNum)) {
            res.status(400).json({
                success: false,
                message: 'ID de profil invalide'
            });
            return;
        }

        // Timeout réduit pour les requêtes SQL (laisser du temps pour les autres opérations)
        const [profile, pinData] = await Promise.all([
            withQueryTimeout(
                sql`SELECT * FROM profiles WHERE id = ${profileIdNum} AND is_active = true`,
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
            res.status(401).json({
                success: false,
                message: 'Profil ou code PIN invalide'
            });
            return;
        }

        // Vérification du PIN (peut être lente avec les logs)
        const isValidPin = await NativeHashService.verifyPin(pin, pinData[0].pin_code);
        if (!isValidPin) {
            res.status(401).json({
                success: false,
                message: 'Code PIN incorrect'
            });
            return;
        }

        // Génération des tokens (rapide)
        const tokenPayload = {
            profileId: profile[0].id,
            name: profile[0].name,
            type: profile[0].type,
            isAdmin: profile[0].is_admin
        };

        const token = generateToken(tokenPayload);
        const sessionToken = generateToken({ profileId: profile[0].id });
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Création de session en arrière-plan (non-bloquant) pour éviter le timeout
        // On ne bloque pas la réponse sur cette opération
        createSession(profile[0].id, sessionToken, expiresAt).catch(err => {
            console.error('⚠️ Erreur lors de la création de session (non-bloquant):', err);
            // On continue même si la session n'a pas pu être créée
        });

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
        const errorResponse = handleError(error, 'Erreur lors de la connexion');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler du code d'entrée familial (Option B - code dédié)
async function handleFamilyGate(req, res) {
    if (req.method === 'POST') {
        // POST : vérifier le code familial
        try {
            const { pin } = req.body;
            if (!pin) {
                res.status(400).json({
                    success: false,
                    message: 'Code familial requis'
                });
                return;
            }
            const row = await withQueryTimeout(
                sql`SELECT pin_hash FROM family_gate WHERE id = 1`,
                TIMEOUTS.STANDARD,
                'family_gate'
            );
            if (!row[0]) {
                res.status(503).json({
                    success: false,
                    message: 'Code d\'entrée familial non configuré'
                });
                return;
            }
            const isValid = await NativeHashService.verifyPin(pin, row[0].pin_hash);
            if (!isValid) {
                res.status(401).json({
                    success: false,
                    message: 'Code incorrect'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Code valide',
                data: { valid: true }
            });
        } catch (error) {
            const errorResponse = handleError(error, 'Erreur vérification code familial');
            res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
        }
        return;
    }
    if (req.method === 'PUT') {
        // PUT : définir ou mettre à jour le code familial (admin uniquement)
        try {
            const user = authenticateToken(req);
            if (!user.isAdmin) {
                res.status(403).json({
                    success: false,
                    message: 'Accès refusé - Admin requis'
                });
                return;
            }
            const { newPin, currentPin } = req.body;
            if (!newPin || newPin.length < 4 || newPin.length > 8) {
                res.status(400).json({
                    success: false,
                    message: 'Nouveau code requis (4 à 8 caractères)'
                });
                return;
            }
            const row = await withQueryTimeout(
                sql`SELECT pin_hash FROM family_gate WHERE id = 1`,
                TIMEOUTS.STANDARD,
                'family_gate'
            );
            if (row[0]) {
                if (!currentPin) {
                    res.status(400).json({
                        success: false,
                        message: 'Code actuel requis pour modifier'
                    });
                    return;
                }
                const validCurrent = await NativeHashService.verifyPin(currentPin, row[0].pin_hash);
                if (!validCurrent) {
                    res.status(401).json({
                        success: false,
                        message: 'Code actuel incorrect'
                    });
                    return;
                }
            }
            const hashedPin = await NativeHashService.hashPin(newPin);
            await withQueryTimeout(
                sql`
                INSERT INTO family_gate (id, pin_hash, updated_at)
                VALUES (1, ${hashedPin}, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                  pin_hash = EXCLUDED.pin_hash,
                  updated_at = CURRENT_TIMESTAMP
                `,
                TIMEOUTS.STANDARD,
                'family_gate update'
            );
            res.status(200).json({
                success: true,
                message: 'Code d\'entrée familial mis à jour'
            });
        } catch (error) {
            const errorResponse = handleError(error, 'Erreur mise à jour code familial');
            res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
        }
        return;
    }
    res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
}

// Handler de déconnexion
async function handleLogout(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
        return;
    }

    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            await deleteSession(token);
        }

        res.status(200).json({
            success: true,
            message: 'Déconnexion réussie'
        });

    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de la déconnexion');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

module.exports = {
    handleLogin,
    handleLogout,
    handleFamilyGate
};
