const express = require('express');
const router = express.Router();

// Importation des sous-routeurs (Modularité stricte)
const authRoutes = require('./auth');
// const apiDiscordRoutes = require('./discord');
// const archivesRoutes = require('./archives');

// Route d'accueil basique (Redirige vers le dashboard si connecté, sinon login)
router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// Page Dashboard (Protégée)
router.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/dashboard');
});

// Connexion des modules
router.use('/auth', authRoutes);
// router.use('/api/discord', apiDiscordRoutes);
// router.use('/archives', archivesRoutes);

// Gestion de la 404
router.use((req, res) => {
    res.status(404).render('pages/404', { message: 'Page introuvable' });
});

module.exports = router;