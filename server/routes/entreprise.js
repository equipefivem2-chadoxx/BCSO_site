const express = require('express');
const router = express.Router();

// 🚀 Page de connexion Entreprise
router.get('/login', (req, res) => {
    if (req.session.entreprise) return res.redirect('/entreprise/portail');
    res.render('pages/login-entreprise', { 
        title: 'BCSO - Connexion Partenaire',
        error: req.query.error
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

        // On crée une session propre à l'entreprise
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
        // On récupère uniquement les agents enregistrés, triés par matricule
        const agents = await Agent.find().sort({ matricule: 1 });

        res.render('pages/portal-entreprise', {
            title: `Annuaire BCSO - ${req.session.entreprise.nom}`,
            entreprise: req.session.entreprise,
            agents: agents
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