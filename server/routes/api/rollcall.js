const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const RollCall = require('../../models/RollCall');
const Agent = require('../../models/Agent');

// 🚀 NOUVELLE ROUTE : Gérer le pass depuis le bot Discord
router.post('/pass', async (req, res) => {
    const { discordId, action } = req.body;

    if (!discordId || !action) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
        const agent = await Agent.findOne({ discordId: discordId });
        if (!agent) {
            return res.status(404).json({ error: "Agent introuvable en base de données" });
        }

        // On met à jour le pass dans la BDD
        agent.hasPass = (action === 'add');
        await agent.save();

        res.status(200).json({ message: `Pass ${action === 'add' ? 'ajouté' : 'retiré'} avec succès pour ${discordId}`, hasPass: agent.hasPass });
    } catch (err) {
        console.error("❌ Erreur API Pass:", err);
        res.status(500).json({ error: "Erreur serveur interne" });
    }
});

// POST /api/rollcall/update
router.post('/update', async (req, res) => {
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

        const missedCount = await RollCall.countDocuments({
            $or: [
                { "reponses": { $elemMatch: { discordId: discordId, status: 'absent' } } },
                { "reponses.discordId": { $ne: discordId } }
            ]
        });

        if (missedCount >= 4) {
            // 🛡️ VÉRIFICATION DU PASS DANS LA BDD
            const agent = await Agent.findOne({ discordId: discordId });
            
            if (agent && agent.hasPass) {
                console.log(`🛡️ [Immunité] Alerte ignorée pour l'ID ${discordId} (Pass actif)`);
            } else {
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
        const agents = await Agent.find({});

        for (const agent of agents) {
            if (!agent.discordId) continue;
            
            // 🛡️ Si l'agent a un pass dans la BDD, on l'ignore instantanément !
            if (agent.hasPass) continue;

            const discordId = agent.discordId;

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