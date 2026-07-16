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

// 🚀 ROUTE 1 DU HUB : LE LIVRET
router.get('/documents/livret', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/livret', { 
        title: 'BCSO - Livret d\'informations',
        user: req.session.user
    });
});

// 🚀 ROUTE 2 DU HUB : LA PAGE ARBRE DE PROCÉDURE
router.get('/documents/doc-arrestations', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/doc-arrestations', { 
        title: 'BCSO - Arbre d\'Arrestations',
        user: req.session.user
    });
});

// 🚀 ROUTE 3 DU HUB : LA NOUVELLE PAGE ARMURERIE
router.get('/documents/armes', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/doc-armes', { 
        title: 'BCSO - Catégories des Armes',
        user: req.session.user
    });
});

// 🚀 ROUTE 4 DU HUB : SÉLECTION DU JUNIOR À ÉVALUER (Vérification BDD en temps réel)
router.get('/documents/evaluer-junior', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        
        // On va chercher la vraie fiche fraîche de l'agent en direct de la base de données
        const agentDB = await Agent.findOne({ discordId: discordId });

        // Vérification des privilèges administrateurs
        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        // Cas 1 : Agent introuvable en base de données et pas admin
        if (!agentDB && !isUserAdmin) {
            return res.render('pages/rapport-junior', {
                title: 'BCSO - Accès Refusé',
                user: req.session.user,
                accessDenied: true,
                reason: 'unregistered',
                currentGrade: 'Compte non lié',
                juniors: []
            });
        }

        // Cas 2 : L'agent a le grade Deputy Junior en direct de la BDD et n'est pas admin
        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        if (currentGrade === 'Deputy Junior' && !isUserAdmin) {
            return res.render('pages/rapport-junior', {
                title: 'BCSO - Habilitation Insuffisante',
                user: req.session.user,
                accessDenied: true,
                reason: 'junior',
                currentGrade: currentGrade,
                juniors: []
            });
        }

        // Si tout est bon (ex: il vient de passer Deputy I en BDD !), on charge la liste
        const juniors = await Agent.find({ grade: 'Deputy Junior' }).sort({ nom: 1 });

        res.render('pages/rapport-junior', { 
            title: 'BCSO - Évaluation Junior',
            user: req.session.user,
            accessDenied: false,
            juniors: juniors
        });
    } catch (err) {
        console.error("Erreur récupération des Juniors:", err);
        res.redirect('/documents');
    }
});

// 🚀 ROUTE 5 DU HUB : PAGE DE FORMULAIRE (Vérification BDD en temps réel)
router.get('/documents/evaluer-junior/formulaire/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        if (!agentDB && !isUserAdmin) {
            return res.redirect('/documents/evaluer-junior');
        }

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        if (currentGrade === 'Deputy Junior' && !isUserAdmin) {
            return res.redirect('/documents/evaluer-junior');
        }

        const junior = await Agent.findById(req.params.id);
        if (!junior) return res.redirect('/documents/evaluer-junior');

        res.render('pages/formulaire-junior', {
            title: 'BCSO - Fiche d\'évaluation',
            user: req.session.user,
            junior: junior
        });
    } catch (err) {
        res.redirect('/documents/evaluer-junior');
    }
});

// ========================================================
// 🔵 ANCIENNES ROUTES (INTACTES POUR LE MENU DU LIVRET)
// ========================================================
router.get('/arrestations', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/arrestations', { 
        title: 'BCSO - Procédure d\'Arrestations',
        user: req.session.user
    });
});

router.get('/fusillades', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/fusillades', { 
        title: 'BCSO - Engagements & Fusillades',
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