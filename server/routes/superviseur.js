const express = require('express');
const router = express.Router();

// 🚀 Route Principale : Affichage du Panel Supervision
router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        // Liste des grades autorisés pour la supervision
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];
        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        // Si l'agent n'a ni le grade SLO+, ni les droits admin -> Refus
        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.render('pages/superviseur', {
                title: 'BCSO - Accès Refusé',
                user: req.session.user,
                accessDenied: true,
                currentGrade: currentGrade || 'Non habilité',
                rapports: []
            });
        }

        // Récupération des rapports
        let rapports = [];
        try {
            const RapportJunior = require('../models/RapportJunior');
            rapports = await RapportJunior.find().sort({ dateCreation: -1 });
        } catch (err) {
            console.log("Modèle RapportJunior en attente d'initialisation...");
        }

        res.render('pages/superviseur', { 
            title: 'BCSO - Panel Supervision',
            user: req.session.user,
            accessDenied: false,
            rapports: rapports
        });

    } catch (error) {
        console.error('Erreur lors du chargement du panel superviseur:', error);
        res.redirect('/dashboard');
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

        res.render('pages/rapport-detail', {
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
        res.redirect('/superviseur');
    } catch (err) {
        res.redirect('/superviseur');
    }
});

module.exports = router;