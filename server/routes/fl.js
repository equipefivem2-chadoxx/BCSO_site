const express = require('express');
const router = express.Router();
const { requireAuth, requireDeputyMinimum } = require('../middleware/checkAuth');

// Afficher le formulaire avec la liste des agents
router.get('/remplir', requireAuth, requireDeputyMinimum, async (req, res) => {
    try {
        const Agent = require('../models/Agent');
        const agents = await Agent.find().sort({ matricule: 1, nom: 1 });

        res.render('pages/formulaire-fl', {
            title: 'BCSO - Remplir une FL',
            user: req.session.user,
            agents: agents
        });
    } catch (error) {
        console.error('Erreur affichage formulaire FL:', error);
        res.redirect('/dashboard');
    }
});

// Traitement et sauvegarde de la grille FL
router.post('/sauvegarder', requireAuth, requireDeputyMinimum, async (req, res) => {
    try {
        const Agent = require('../models/Agent');
        const FicheLiaison = require('../models/FicheLiaison');
        
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });
        
        const nomEval = agentDB ? `${agentDB.matricule} - ${agentDB.prenom} ${agentDB.nom}` : req.session.user.username;
        const gradeEval = agentDB ? agentDB.grade : req.session.user.grade;

        const agentEvalue = await Agent.findById(req.body.agentEvalueId);
        const nomEvalue = agentEvalue ? `${agentEvalue.prenom} ${agentEvalue.nom}` : "Agent Inconnu";
        const matriculeEvalue = agentEvalue ? agentEvalue.matricule : "000";

        const nouvelleFL = new FicheLiaison({
            evaluateurId: discordId,
            nomEvaluateur: nomEval,
            gradeEvaluateur: gradeEval,
            
            agentEvalueId: req.body.agentEvalueId,
            nomAgentEvalue: nomEvalue,
            matriculeAgentEvalue: matriculeEvalue,
            
            datePassage: req.body.datePassage,
            criteres: req.body.criteres,
            commentaireEvaluateur: req.body.commentaireEvaluateur,
            decision: req.body.decision
        });

        await nouvelleFL.save();
        res.redirect('/dashboard?success=fl');
    } catch (err) {
        console.error("Erreur lors de la création de la FL :", err);
        res.redirect('/fl/remplir?error=1');
    }
});

module.exports = router;