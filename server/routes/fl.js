const express = require('express');
const router = express.Router();
const { requireAuth, requireDeputyMinimum } = require('../middleware/checkAuth');

// 🚀 Route 1 : Affichage du formulaire (Bloqué aux Deputy Junior via le middleware)
router.get('/remplir', requireAuth, requireDeputyMinimum, async (req, res) => {
    try {
        res.render('pages/formulaire-fl', {
            title: 'BCSO - Remplir une FL',
            user: req.session.user
        });
    } catch (error) {
        console.error('Erreur affichage formulaire FL:', error);
        res.redirect('/dashboard');
    }
});

// 🚀 Route 2 : Traitement et sauvegarde de la Fiche de Liaison
router.post('/sauvegarder', requireAuth, requireDeputyMinimum, async (req, res) => {
    try {
        const Agent = require('../models/Agent');
        const FicheLiaison = require('../models/FicheLiaison');
        
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });
        
        const nomComplet = agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username;
        const grade = agentDB ? agentDB.grade : req.session.user.grade;

        const nouvelleFL = new FicheLiaison({
            auteurId: discordId,
            nomAuteur: nomComplet,
            gradeAuteur: grade,
            sujet: req.body.sujet,
            departementConcerne: req.body.departementConcerne,
            description: req.body.description
        });

        await nouvelleFL.save();
        res.redirect('/dashboard?success=fl');
    } catch (err) {
        console.error("Erreur lors de la création de la FL :", err);
        res.redirect('/fl/remplir?error=1');
    }
});

module.exports = router;