const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const RollCall = require('../../models/RollCall');
const Agent = require('../../models/Agent'); // On importe le modèle Agent pour lister les effectifs

// POST /api/rollcall/update
router.post('/update', async (req, res) => {
    // Le bot doit envoyer: { "date": "23/07/26", "discordId": "123456789", "status": "present" }
    // Status peut être: 'present', 'absent', 'retard', ou 'remove'
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

        // 🚀 VÉRIFICATION EN DIRECT : Comptage des 4 absences / non-réactions
        const missedCount = await RollCall.countDocuments({
            $or: [
                { "reponses": { $elemMatch: { discordId: discordId, status: 'absent' } } },
                { "reponses.discordId": { $ne: discordId } }
            ]
        });

        if (missedCount >= 4) {
            try {
                await fetch('http://localhost:3000/api/check-absence', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ discordId })
                });
                console.log(`📡 [Alerte Rollcall] Requête envoyée au bot pour ${discordId} (${missedCount} manqués)`);
            } catch (botErr) {
                console.error("❌ Impossible de contacter le bot Discord :", botErr.message);
            }
        }

        res.status(200).json({ message: "Rollcall mis à jour", rollcall });
    } catch (err) {
        console.error("Erreur API Rollcall:", err);
        res.status(500).json({ error: "Erreur serveur interne" });
    }
});

// ⏰ TÂCHE PLANIFIÉE : Tous les jours à 00h00
cron.schedule('0 0 * * *', async () => {
    console.log("⏰ [Cron] Clôture journalière : Vérification des absences Rollcall...");
    try {
        // On récupère tous les agents enregistrés dans la base
        const agents = await Agent.find({});

        for (const agent of agents) {
            // On s'assure que l'agent a bien un ID Discord d'enregistré
            if (!agent.discordId) continue;

            const discordId = agent.discordId;

            // On recalcule le total des manquements pour chaque agent
            const missedCount = await RollCall.countDocuments({
                $or: [
                    { "reponses": { $elemMatch: { discordId: discordId, status: 'absent' } } },
                    { "reponses.discordId": { $ne: discordId } }
                ]
            });

            // S'il a 4 manquements ou plus, on lance l'alerte au bot
            if (missedCount >= 4) {
                try {
                    await fetch('http://localhost:3000/api/check-absence', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ discordId })
                    });
                    console.log(`📡 [Cron] Alerte envoyée pour ${discordId} (${missedCount} manqués)`);
                } catch (botErr) {
                    console.error(`❌ [Cron] Erreur contact bot pour ${discordId} :`, botErr.message);
                }
            }
        }
        console.log("✅ [Cron] Vérification terminée !");
    } catch (error) {
        console.error("❌ [Cron] Erreur lors de la vérification globale :", error);
    }
});

module.exports = router;