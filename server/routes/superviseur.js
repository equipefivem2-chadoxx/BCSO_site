const express = require('express');
const router = express.Router();

// 🚀 Route 1 : Affichage du Hub (index.ejs)
router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.render('pages/superviseur/refus', {
                title: 'BCSO - Accès Refusé',
                user: viewUser, 
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

        // 🚀 NOUVEAU : Récupération des stats des passages pour le Dashboard
        const Entreprise = require('../models/Entreprise');
        const entreprisesStats = await Entreprise.find().sort({ totalPassages: -1 });
        const topAgents = await Agent.find({ passagesTotal: { $gt: 0 } }).sort({ passagesTotal: -1 }).limit(10);

        res.render('pages/superviseur/index', { 
            title: 'BCSO - Hub Supervision',
            user: viewUser, 
            rapports: rapports,
            entreprisesStats: entreprisesStats, // 🚀 Injecté ici
            topAgents: topAgents // 🚀 Injecté ici
        });

    } catch (error) {
        console.error('Erreur hub superviseur:', error);
        res.redirect('/dashboard');
    }
});

// 🚀 Route 2 : La liste des évaluations
router.get('/evaluations', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.render('pages/superviseur/refus', {
                title: 'BCSO - Accès Refusé',
                user: viewUser, 
                currentGrade: currentGrade || 'Non habilité'
            });
        }

        const RapportJunior = require('../models/RapportJunior');
        const rapports = await RapportJunior.find().sort({ dateCreation: -1 });

        res.render('pages/superviseur/evaluations', { 
            title: 'BCSO - Évaluations Juniors',
            user: viewUser, 
            rapports: rapports
        });

    } catch (error) {
        console.error('Erreur liste evaluations:', error);
        res.redirect('/superviseur');
    }
});

// 🚀 Route 3 : Lire une évaluation détaillée
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

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.redirect('/superviseur');
        }

        const rapport = await RapportJunior.findById(req.params.id);
        if (!rapport) return res.redirect('/superviseur');

        res.render('pages/superviseur/rapport-detail', {
            title: `Évaluation - ${rapport.nomJunior}`,
            user: viewUser, 
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

// 🚀 Route pour supprimer UN rapport
router.post('/rapport/:id/supprimer', async (req, res) => {
    try {
        const RapportJunior = require('../models/RapportJunior');
        await RapportJunior.findByIdAndDelete(req.params.id);
        res.redirect('/superviseur/evaluations');
    } catch (err) {
        res.redirect('/superviseur');
    }
});

// 🚀 Route de purge complète (Admins)
router.post('/evaluations/supprimer-tout', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        if (!isUserAdmin) {
            return res.redirect('/superviseur/evaluations');
        }

        const RapportJunior = require('../models/RapportJunior');
        await RapportJunior.deleteMany({});
        res.redirect('/superviseur/evaluations?success=purged');

    } catch (err) {
        console.error("Erreur lors de la purge globale:", err);
        res.redirect('/superviseur/evaluations');
    }
});

module.exports = router;