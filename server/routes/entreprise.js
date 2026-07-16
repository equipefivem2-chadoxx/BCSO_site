const express = require('express');
const router = express.Router();

// 🚀 Page de connexion Entreprise
router.get('/login', (req, res) => {
    if (req.session.entreprise) return res.redirect('/entreprise/portail');
    res.render('pages/login-entreprise', { 
        title: 'BCSO - Connexion Partenaire',
        error: req.query.error,
        layout: false // 🚨 OBLIGATOIRE : Désactive la sidebar et le header policier
    });
});

// 🚀 Traitement de la connexion
router.post('/login', async (req, res) => {
    try {
        const Entreprise = require('../models/Entreprise');
        const { identifiant, motDePasse } = req.body;

        const entreprise = await Entreprise.findOne({ identifiant, motDePasse });
        if (!entreprise) {
            return res.redirect('/entreprise/login?error=1');
        }

        req.session.entreprise = entreprise;
        res.redirect('/entreprise/portail');
    } catch (err) {
        console.error("Erreur login entreprise :", err);
        res.redirect('/entreprise/login?error=1');
    }
});

// 🚀 L'annuaire téléphonique officiel (Portail)
router.get('/portail', async (req, res) => {
    if (!req.session.entreprise) return res.redirect('/entreprise/login');

    try {
        const Agent = require('../models/Agent');
        const agents = await Agent.find();

        // 🚀 Tri des agents par ordre de grade
        const ordreGrades = [
            'Sheriff', 'Lieutenant', 'Sergeant Chef', 'Sergeant II', 'Sergeant I', 
            'SLO', 'Deputy III', 'Deputy II', 'Deputy I', 'Deputy Junior'
        ];

        agents.sort((a, b) => {
            const indexA = ordreGrades.indexOf(a.grade);
            const indexB = ordreGrades.indexOf(b.grade);
            if (indexA !== indexB) return indexA - indexB;
            // Si même grade, tri par matricule
            return a.matricule.localeCompare(b.matricule, undefined, { numeric: true, sensitivity: 'base' });
        });

        res.render('pages/portal-entreprise', {
            title: `Annuaire BCSO - ${req.session.entreprise.nom}`,
            entreprise: req.session.entreprise,
            agents: agents,
            layout: false // 🚨 OBLIGATOIRE : Désactive la sidebar et le header policier
        });
    } catch (err) {
        res.redirect('/entreprise/login');
    }
});

// 🚀 Déconnexion
router.get('/logout', (req, res) => {
    delete req.session.entreprise;
    res.redirect('/entreprise/login');
});

module.exports = router;