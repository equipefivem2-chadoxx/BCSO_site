const express = require('express');
const router = express.Router();

// Importation des sous-routeurs (Modularité stricte respectée)
const authRoutes = require('./auth');
const adminRoutes = require('./admin'); 
const effectifsRoutes = require('./effectifs');
const archivesRoutes = require('./archives'); // 🚀 NOUVEAU : Page d'affichage des archives
const apiTicketsRoutes = require('./api/tickets'); // 🚀 NOUVEAU : Route API pour le bot Discord

router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// Page Dashboard (Protégée)
router.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    let agentsCount = 0;
    try {
        // Comptage dynamique depuis MongoDB
        const Agent = require('../models/Agent');
        agentsCount = await Agent.countDocuments();
    } catch (err) {
        // Sécurité : si le modèle crash ou n'existe pas encore, on renvoie 0
        console.log('Attente de la création de la collection Agent...');
    }
    
    res.render('pages/dashboard', { 
        title: 'BCSO - Dashboard Principal',
        agentsCount: agentsCount // On envoie le vrai chiffre à la page EJS
    });
});

// Connexion de tous les modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/effectifs', effectifsRoutes);
router.use('/archives', archivesRoutes); // 🚀 AJOUTÉ
router.use('/api/tickets', apiTicketsRoutes); // 🚀 AJOUTÉ

// Gestion de la 404
router.use((req, res) => {
    res.status(404).render('pages/404', { 
        message: 'Page introuvable',
        title: '404 - Introuvable'
    });
});

module.exports = router;