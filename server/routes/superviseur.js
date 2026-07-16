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

        // Tentative de récupération des rapports (En attendant que la BDD soit prête)
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

module.exports = router;