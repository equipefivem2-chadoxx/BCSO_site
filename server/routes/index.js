const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const adminRoutes = require('./admin'); 
const effectifsRoutes = require('./effectifs');
const archivesRoutes = require('./archives');
const apiTicketsRoutes = require('./api/tickets');
const superviseurRoutes = require('./superviseur');

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

router.get('/reglement', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/reglement', { 
        title: 'BCSO - Règlement',
        user: req.session.user
    });
});

router.get('/lois', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/lois', { 
        title: 'BCSO - Livre des Lois',
        user: req.session.user
    });
});

router.get('/formations', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/formations', { 
        title: 'BCSO - Formations',
        user: req.session.user
    });
});

router.get('/documents', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/documents', { 
        title: 'BCSO - Base Documentaire',
        user: req.session.user
    });
});

router.get('/documents/livret', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/livret', { 
        title: 'BCSO - Livret d\'informations',
        user: req.session.user
    });
});

router.get('/documents/doc-arrestations', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/doc-arrestations', { 
        title: 'BCSO - Arbre d\'Arrestations',
        user: req.session.user
    });
});

router.get('/documents/armes', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('pages/doc-armes', { 
        title: 'BCSO - Catégories des Armes',
        user: req.session.user
    });
});

router.get('/documents/evaluer-junior', async (req, res) => {
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
            return res.render('pages/rapport-junior', {
                title: 'BCSO - Accès Refusé',
                user: req.session.user,
                accessDenied: true,
                reason: 'unregistered',
                currentGrade: 'Compte non lié',
                juniors: []
            });
        }

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

// 🚀 ROUTE POUR SAUVEGARDER L'ÉVALUATION
router.post('/documents/evaluer-junior/sauvegarder', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const RapportJunior = require('../models/RapportJunior');
        const Agent = require('../models/Agent');

        const evaluateurDiscordId = req.session.user.id || req.session.user.discordId;
        const evaluateurDB = await Agent.findOne({ discordId: evaluateurDiscordId });
        
        const nomEval = evaluateurDB ? `${evaluateurDB.prenom} ${evaluateurDB.nom}` : req.session.user.username;
        const gradeEval = evaluateurDB ? evaluateurDB.grade : 'Admin';

        const nouveauRapport = new RapportJunior({
            evaluateurId: evaluateurDiscordId,
            nomEvaluateur: nomEval,
            gradeEvaluateur: gradeEval,
            
            juniorId: req.body.juniorId,
            nomJunior: req.body.nomJunior,
            matriculeJunior: req.body.matriculeJunior,
            
            criteres: req.body.criteres, 
            remarqueGlobale: req.body.remarqueGlobale,
            avis: req.body.avis
        });

        await nouveauRapport.save();

        // 🔌 NOUVEAU : Déclencheur Temps Réel Socket.io
        // Si Socket.io est bien initialisé, on envoie le signal à tous les clients connectés
        if (req.app.get('io')) {
            req.app.get('io').emit('nouvelle-evaluation', nouveauRapport);
        }

        res.redirect('/documents/evaluer-junior?success=1');
        
    } catch (err) {
        console.error("Erreur lors de la sauvegarde du rapport :", err);
        res.redirect('/documents/evaluer-junior?error=1');
    }
});

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
router.use('/superviseur', superviseurRoutes); 
router.use('/effectifs', effectifsRoutes);
router.use('/archives', archivesRoutes);
router.use('/api/tickets', apiTicketsRoutes);

router.use((req, res) => {
    res.status(404).render('pages/404', { message: 'Page introuvable', title: '404' });
});

module.exports = router;