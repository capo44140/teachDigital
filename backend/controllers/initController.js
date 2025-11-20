// Handler d'initialisation des pins
async function handleInitPins(req, res) {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Méthode non autorisée' });
            return;
        }

        // Logique d'initialisation des pins
        res.json({ success: true, message: 'Pins initialisés' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    handleInitPins
};
