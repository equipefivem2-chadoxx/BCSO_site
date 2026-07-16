const express = require('express');
const router = express.Router();

// 🚀 Route 1 : Affichage du Hub (index.ejs)
router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];
        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            // CORRECTION: On pointe vers le fichier refus dans le dossier
            return res.render('pages/superviseur/refus', {
                title: 'BCSO - Accès Refusé',
                user: req.session.user,
                currentGrade: currentGrade || 'Non habilité'
            });
        }

        let rapports = [];
        try {
            const RapportJunior = require('../models/RapportJunior');
            rapports = await RapportJunior.find().sort({ dateCreation: -1 });
        } catch (err) {
            console.log("Modèle RapportJunior en attente d'initialisation...");
        }

        // CORRECTION: On pointe vers l'index dans le dossier
        res.render('pages/superviseur/index', { 
            title: 'BCSO - Hub Supervision',
            user: req.session.user,
            rapports: rapports
        });

    } catch (error) {
        console.error('Erreur hub superviseur:', error);
        res.redirect('/dashboard');
    }
});

// 🚀 NOUVELLE ROUTE : La liste des évaluations (le tableau)
router.get('/evaluations', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];
        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.render('pages/superviseur/refus', {
                title: 'BCSO - Accès Refusé',
                user: req.session.user,
                currentGrade: currentGrade || 'Non habilité'
            });
        }

        const RapportJunior = require('../models/RapportJunior');
        const rapports = await RapportJunior.find().sort({ dateCreation: -1 });

        // On pointe vers le fichier evaluations.ejs
        res.render('pages/superviseur/evaluations', { 
            title: 'BCSO - Évaluations Juniors',
            user: req.session.user,
            rapports: rapports
        });

    } catch (error) {
        console.error('Erreur liste evaluations:', error);
        res.redirect('/superviseur');
    }
});

// 🚀 Route pour lire une évaluation détaillée
router.get('/rapport/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const RapportJunior = require('../models/RapportJunior');
        
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.redirect('/superviseur');
        }

        const rapport = await RapportJunior.findById(req.params.id);
        if (!rapport) return res.redirect('/superviseur');

        // CORRECTION: On pointe vers le sous-dossier
        res.render('pages/superviseur/rapport-detail', {
            title: `Évaluation - ${rapport.nomJunior}`,
            user: req.session.user,
            rapport: rapport,
            isUserAdmin: isUserAdmin
        });

    } catch (err) {
        console.error("Erreur lecture rapport:", err);
        res.redirect('/superviseur');
    }
});

// 🚀 Route pour changer le statut (Valider)
router.post('/rapport/:id/valider', async (req, res) => {
    try {
        const RapportJunior = require('../models/RapportJunior');
        await RapportJunior.findByIdAndUpdate(req.params.id, { statut: 'valide' });
        res.redirect(`/superviseur/rapport/${req.params.id}`);
    } catch (err) {
        res.redirect('/superviseur');
    }
});

// 🚀 Route pour supprimer un rapport (Admin)
router.post('/rapport/:id/supprimer', async (req, res) => {
    try {
        const RapportJunior = require('../models/RapportJunior');
        await RapportJunior.findByIdAndDelete(req.params.id);
        res.redirect('/superviseur/evaluations');
    } catch (err) {
        res.redirect('/superviseur');
    }
});

module.exports = router;