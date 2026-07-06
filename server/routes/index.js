const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const adminRoutes = require('./admin'); 
const effectifsRoutes = require('./effectifs');
const archivesRoutes = require('./archives');
const apiTicketsRoutes = require('./api/tickets');

router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

router.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    let agentsCount = 0;
    let ticketsArchivesCount = 0;
    let recentTickets = []; 

    try {
        const Agent = require('../models/Agent');
        agentsCount = await Agent.countDocuments();
        
        const Ticket = require('../models/Ticket');
        ticketsArchivesCount = await Ticket.countDocuments();
        
        recentTickets = await Ticket.find({}).sort({ dateCreation: -1 }).limit(5);
    } catch (err) {
        console.log('Attente de la création des collections...');
    }

    let ticketsEnCoursCount = req.app.locals.ticketsEnCoursCount || 0;

    res.render('pages/dashboard', { 
        title: 'BCSO - Dashboard Principal',
        user: req.session.user,
        agentsCount: agentsCount,
        ticketsArchivesCount: ticketsArchivesCount,
        ticketsEnCoursCount: ticketsEnCoursCount,
        recentTickets: recentTickets 
    });
});

// Route pour la page Règlement
router.get('/reglement', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/reglement', { 
        title: 'BCSO - Règlement',
        user: req.session.user
    });
});

// Route pour la page Livre des Lois
router.get('/lois', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/lois', { 
        title: 'BCSO - Livre des Lois',
        user: req.session.user
    });
});

// Route pour la page Formations
router.get('/formations', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/formations', { 
        title: 'BCSO - Formations',
        user: req.session.user
    });
});

// 🚀 LE HUB DOCUMENTAIRE
router.get('/documents', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/documents', { 
        title: 'BCSO - Base Documentaire',
        user: req.session.user
    });
});

// 🚀 NOUVELLE ROUTE : LE LIVRET D'INFORMATIONS INTERACTIF
router.get('/documents/livret', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/livret', { 
        title: 'BCSO - Livret d\'informations',
        user: req.session.user
    });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/effectifs', effectifsRoutes);
router.use('/archives', archivesRoutes);
router.use('/api/tickets', apiTicketsRoutes);

router.use((req, res) => {
    res.status(404).render('pages/404', { message: 'Page introuvable', title: '404' });
});

module.exports = router;