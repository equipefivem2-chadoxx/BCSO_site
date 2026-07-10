const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const RapportJunior = require('../models/RapportJunior');

// 🚀 SÉCURITÉ : Bloque tout le monde sauf Sergent et supérieurs
const checkCommandement = async (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const agent = await Agent.findOne({ discordId: req.session.user.id });
        const commandGrades = ['Sheriff', 'Lieutenant', 'Sergeant Chef', 'Sergeant II', 'Sergeant I'];
        
        let isSup = false;
        
        if (req.session.user.role === 'admin' || req.session.user.id === '1247264549489610897' || req.session.user.isAdmin === true) {
            isSup = true;
        }
        
        if (agent && commandGrades.includes(agent.grade)) {
            isSup = true;
        }

        if (isSup) {
            req.agentActuel = agent; // Transmet l'agent à la vue pour la sidebar
            return next();
        }
        
        // Si c'est un Deputy qui essaye de frauder l'URL Commandement
        return res.status(403).send(`
            <html>
            <body style="background-color: #07090e; color: #e2e8f0; font-family: 'Montserrat', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                <i class="fas fa-lock" style="font-size: 80px; color: #ef4444; margin-bottom: 20px;"></i>
                <h1 style="color: #ef4444; letter-spacing: 2px; text-transform: uppercase;">Accès Commandement Refusé</h1>
                <p style="color: #94a3b8; font-size: 16px; margin-bottom: 30px;">Cette section est strictement réservée aux officiers de commandement (Sergent et plus).</p>
                <a href="/dashboard" style="background: rgba(189, 165, 129, 0.1); border: 1px solid #bda581; color: #bda581; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Retour à l'accueil</a>
            </body>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            </html>
        `);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Erreur de sécurité.");
    }
};

router.use(checkCommandement);

// Page d'accueil : Liste des archives
router.get('/', async (req, res) => {
    try {
        const rapports = await RapportJunior.find().sort({ dateCreation: -1 });
        res.render('pages/superviseur', { 
            title: 'BCSO - Archives Commandement', 
            user: req.session.user, 
            agentActuel: req.agentActuel,
            rapports 
        });
    } catch (err) {
        res.status(500).send("Erreur DB.");
    }
});

// Supprimer une archive
router.post('/supprimer/:id', async (req, res) => {
    try {
        await RapportJunior.findByIdAndDelete(req.params.id);
        res.redirect('/superviseur');
    } catch (err) {
        res.status(500).send("Erreur lors de la suppression.");
    }
});

module.exports = router;