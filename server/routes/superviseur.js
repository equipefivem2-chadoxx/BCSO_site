const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const RapportJunior = require('../models/RapportJunior');

// 🚀 MIDDLEWARE DE SÉCURITÉ : Bloque les grades inférieurs (Deputy)
const checkSuperviseur = async (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const agent = await Agent.findOne({ discordId: req.session.user.id });
        const commandGrades = ['Sheriff', 'Lieutenant', 'Sergeant Chef', 'Sergeant II', 'Sergeant I'];
        
        let isSup = false;
        
        // Vérification Admin global
        if (req.session.user.role === 'admin' || req.session.user.id === '1247264549489610897' || req.session.user.isAdmin === true) {
            isSup = true;
        }
        
        // Vérification Grade In-Game
        if (agent && commandGrades.includes(agent.grade)) {
            isSup = true;
        }

        if (isSup) {
            req.agentActuel = agent; // Sauvegarde l'agent pour l'utiliser dans les formulaires
            return next();
        } else {
            // Page d'erreur propre si un Deputy essaie de forcer l'URL
            return res.status(403).send(`
                <html>
                <body style="background-color: #07090e; color: #e2e8f0; font-family: 'Montserrat', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <i class="fas fa-shield-alt" style="font-size: 80px; color: #ef4444; margin-bottom: 20px;"></i>
                    <h1 style="color: #ef4444; letter-spacing: 2px; text-transform: uppercase;">Accès Refusé</h1>
                    <p style="color: #94a3b8; font-size: 16px; margin-bottom: 30px;">Vous n'avez pas l'habilitation nécessaire (Sergent minimum) pour accéder au centre de commandement.</p>
                    <a href="/dashboard" style="background: rgba(189, 165, 129, 0.1); border: 1px solid #bda581; color: #bda581; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Retour au Dashboard</a>
                </body>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                </html>
            `);
        }
    } catch (err) {
        console.error(err);
        return res.status(500).send("Erreur de vérification des droits.");
    }
};

// On applique la sécurité sur toute la route
router.use(checkSuperviseur);

// Page d'accueil : Liste des rapports
router.get('/', async (req, res) => {
    try {
        const rapports = await RapportJunior.find().sort({ dateCreation: -1 });
        res.render('pages/superviseur', { 
            title: 'BCSO - Espace Commandement', 
            user: req.session.user, 
            rapports 
        });
    } catch (err) {
        res.status(500).send("Erreur lors de la récupération des rapports.");
    }
});

// Page pour créer un nouveau rapport
router.get('/nouveau-rapport', async (req, res) => {
    try {
        // Récupère uniquement les grades de base pour la liste déroulante (SLO et Deputies)
        const rookies = await Agent.find({ 
            grade: { $in: ['SLO', 'Deputy I', 'Deputy II', 'Deputy III', 'Deputy Junior'] } 
        }).sort({ grade: 1, nom: 1 });
        
        res.render('pages/rapport-junior', { 
            title: 'BCSO - Nouveau Rapport', 
            user: req.session.user, 
            agentActuel: req.agentActuel,
            rookies 
        });
    } catch (err) {
        res.status(500).send("Erreur.");
    }
});

// Traitement du formulaire soumis
router.post('/nouveau-rapport', async (req, res) => {
    try {
        const rookie = await Agent.findById(req.body.rookieId);
        if(!rookie) return res.status(400).send("Agent introuvable.");

        const instructeurNom = req.agentActuel ? `${req.agentActuel.prenom} ${req.agentActuel.nom} [${req.agentActuel.matricule}]` : req.session.user.username;

        const nouveauRapport = new RapportJunior({
            instructeurId: req.session.user.id,
            instructeurNom: instructeurNom,
            rookieId: rookie._id,
            rookieNom: `${rookie.prenom} ${rookie.nom} [${rookie.matricule}]`,
            evalMiseEnDanger: req.body.evalMiseEnDanger,
            analyseSituation: req.body.analyseSituation,
            fluiditeRadio: req.body.fluiditeRadio,
            reponseSystematique: req.body.reponseSystematique,
            reponseRapide: req.body.reponseRapide,
            tenirPoursuite: req.body.tenirPoursuite,
            coherence1020: req.body.coherence1020,
            gestionDispatch: req.body.gestionDispatch,
            respectCodeRoute: req.body.respectCodeRoute,
            controleRoutier: req.body.controleRoutier,
            gestionArrestation: req.body.gestionArrestation,
            redactionRapport: req.body.redactionRapport,
            impartialite: req.body.impartialite,
            contactProximite: req.body.contactProximite,
            remarques: req.body.remarques
        });

        await nouveauRapport.save();
        res.redirect('/superviseur');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur lors de l'enregistrement du rapport.");
    }
});

module.exports = router;