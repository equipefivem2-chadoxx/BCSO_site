const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const RapportJunior = require('../models/RapportJunior');

// 🚀 MIDDLEWARE DE SÉCURITÉ : Bloque les grades inférieurs (Sergent minimum pour les archives)
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

// 🚀 MIDDLEWARE DE SÉCURITÉ : Bloque UNIQUEMENT les Deputy Junior pour la création
const checkCreation = async (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const agent = await Agent.findOne({ discordId: req.session.user.id });
        const isAdmin = req.session.user.role === 'admin' || req.session.user.id === '1247264549489610897' || req.session.user.isAdmin === true;

        if (!isAdmin && agent && agent.grade === 'Deputy Junior') {
             return res.status(403).send(`
                <html>
                <body style="background-color: #07090e; color: #e2e8f0; font-family: 'Montserrat', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <i class="fas fa-hand-paper" style="font-size: 80px; color: #ef4444; margin-bottom: 20px;"></i>
                    <h1 style="color: #ef4444; letter-spacing: 2px; text-transform: uppercase;">Accès Refusé</h1>
                    <p style="color: #94a3b8; font-size: 16px; margin-bottom: 30px;">Les Deputy Juniors ne sont pas habilités à rédiger des rapports d'évaluation.</p>
                    <a href="/dashboard" style="background: rgba(189, 165, 129, 0.1); border: 1px solid #bda581; color: #bda581; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Retour au Dashboard</a>
                </body>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                </html>
            `);
        }
        
        req.agentActuel = agent;
        return next();
    } catch (err) {
        console.error(err);
        return res.status(500).send("Erreur de sécurité.");
    }
};

// ========================================================
// 🔵 ROUTES DE CRÉATION (DEPUTY I ET PLUS)
// ========================================================

// Page pour créer un nouveau rapport
router.get('/nouveau-rapport', checkCreation, async (req, res) => {
    try {
        // Récupère UNIQUEMENT les Deputy Junior pour l'évaluation
        const rookies = await Agent.find({ grade: 'Deputy Junior' }).sort({ nom: 1 });
        
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
router.post('/nouveau-rapport', checkCreation, async (req, res) => {
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
        res.redirect('/dashboard'); // On redirige vers le dashboard après soumission
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur lors de l'enregistrement du rapport.");
    }
});

// ========================================================
// 🔵 ROUTES D'ARCHIVES (SERGENT ET PLUS)
// ========================================================

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

// Voir un rapport en détail
router.get('/rapport/:id', async (req, res) => {
    try {
        const rapport = await RapportJunior.findById(req.params.id);
        if (!rapport) return res.status(404).send("Rapport introuvable.");
        res.render('pages/rapport-details', { title: 'Détails du Rapport', user: req.session.user, rapport });
    } catch (err) { res.status(500).send("Erreur."); }
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