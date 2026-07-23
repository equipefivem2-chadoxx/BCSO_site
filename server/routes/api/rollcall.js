const express = require('express');
const router = express.Router();
const RollCall = require('../../models/RollCall');

// POST /api/rollcall/update
router.post('/update', async (req, res) => {
    // Le bot doit envoyer: { "date": "23/07/26", "discordId": "123456789", "status": "present" }
    // Status peut être: 'present', 'absent', 'retard', ou 'remove' (si la personne enlève sa réaction)
    const { date, discordId, status } = req.body; 

    if (!date || !discordId || !status) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
        let rollcall = await RollCall.findOne({ date: date });
        
        if (!rollcall) {
            rollcall = new RollCall({ date: date, reponses: [] });
        }

        const existingIndex = rollcall.reponses.findIndex(r => r.discordId === discordId);

        if (status === 'remove') {
            if (existingIndex !== -1) rollcall.reponses.splice(existingIndex, 1);
        } else {
            if (existingIndex !== -1) {
                rollcall.reponses[existingIndex].status = status;
                rollcall.reponses[existingIndex].heureReponse = Date.now();
            } else {
                rollcall.reponses.push({ discordId, status });
            }
        }

        await rollcall.save();
        res.status(200).json({ message: "Rollcall mis à jour", rollcall });
    } catch (err) {
        console.error("Erreur API Rollcall:", err);
        res.status(500).json({ error: "Erreur serveur interne" });
    }
});

module.exports = router;