const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');

router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const agents = await Agent.find();
        
        // L'ordre hiérarchique absolu
        const hierarchie = [
            'Admin', 'Sheriff', 'Lieutenant', 'Sergeant Chef', 
            'Sergeant II', 'Sergeant I', 'SLO', 'Deputy III', 
            'Deputy II', 'Deputy I', 'Deputy Junior'
        ];
        
        // On trie les agents trouvés dans des catégories selon la hiérarchie
        const effectifsTries = {};
        hierarchie.forEach(grade => {
            const agentsDuGrade = agents.filter(a => a.grade === grade);
            if (agentsDuGrade.length > 0) {
                effectifsTries[grade] = agentsDuGrade;
            }
        });

        res.render('pages/effectifs', { 
            title: 'BCSO - Trombinoscope Effectifs',
            effectifsTries: effectifsTries,
            total: agents.length
        });
    } catch (error) {
        console.error('Erreur Effectifs:', error);
        res.redirect('/dashboard');
    }
});

module.exports = router;