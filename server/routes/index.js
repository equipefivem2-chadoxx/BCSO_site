const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const adminRoutes = require('./admin'); 
const effectifsRoutes = require('./effectifs');
const archivesRoutes = require('./archives');
const apiTicketsRoutes = require('./api/tickets');
const superviseurRoutes = require('./superviseur'); // 🚀 LIAISON DU COMMANDEMENT

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

// ========================================================
// 🚀 NOUVEAU : FORMULAIRE D'ÉVALUATION (DANS DOCUMENTS)
// ========================================================
router.get('/documents/evaluation', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const Agent = require('../models/Agent');
        const agent = await Agent.findOne({ discordId: req.session.user.id });
        const isAdmin = req.session.user.role === 'admin' || req.session.user.id === '1247264549489610897' || req.session.user.isAdmin;
        
        // BLOQUER LES DEPUTY JUNIORS
        if (!isAdmin && agent && agent.grade === 'Deputy Junior') {
            return res.status(403).send(`
                <html>
                <body style="background-color: #07090e; color: #e2e8f0; font-family: 'Montserrat', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <i class="fas fa-hand-paper" style="font-size: 80px; color: #ef4444; margin-bottom: 20px;"></i>
                    <h1 style="color: #ef4444; letter-spacing: 2px; text-transform: uppercase;">Accès Refusé</h1>
                    <p style="color: #94a3b8; font-size: 16px; margin-bottom: 30px;">Les Deputy Juniors ne sont pas habilités à rédiger des rapports d'évaluation.</p>
                    <a href="/documents" style="background: rgba(189, 165, 129, 0.1); border: 1px solid #bda581; color: #bda581; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Retour aux Documents</a>
                </body>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                </html>
            `);
        }

        // On ne récupère QUE les Deputy Juniors dans la liste déroulante
        const rookies = await Agent.find({ grade: 'Deputy Junior' }).sort({ nom: 1 });
        
        res.render('pages/rapport-junior', { 
            title: 'BCSO - Évaluation Junior',
            user: req.session.user,
            rookies
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur serveur.");
    }
});

router.post('/documents/evaluation', async (req, res) => {
    try {
        const Agent = require('../models/Agent');
        const RapportJunior = require('../models/RapportJunior');
        
        const rookie = await Agent.findById(req.body.rookieId);
        if(!rookie) return res.status(400).send("Rookie introuvable.");

        const agent = await Agent.findOne({ discordId: req.session.user.id });
        const instructeurNom = agent ? `${agent.prenom} ${agent.nom} [${agent.matricule}]` : req.session.user.username;

        const nouveauRapport = new RapportJunior({
            instructeurId: req.session.user.id,
            instructeurNom: instructeurNom,
            rookieId: rookie._id,
            rookieNom: `${rookie.prenom} ${rookie.nom} [${rookie.matricule}]`,
            evalMiseEnDanger: req.body.evalMiseEnDanger,
            analyseSituation: req.body.analyseSituation,
            fluiditeRadio: req.body.fluiditeRadio,
            reponseSystematique: req.body.reponseSystematique,
            reponseRapide: req.body.reponseRapide,
            tenirPoursuite: req.body.tenirPoursuite,
            coherence1020: req.body.coherence1020,
            gestionDispatch: req.body.gestionDispatch,
            respectCodeRoute: req.body.respectCodeRoute,
            controleRoutier: req.body.controleRoutier,
            gestionArrestation: req.body.gestionArrestation,
            redactionRapport: req.body.redactionRapport,
            impartialite: req.body.impartialite,
            contactProximite: req.body.contactProximite,
            remarques: req.body.remarques
        });

        await nouveauRapport.save();
        res.redirect('/documents');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur lors de l'enregistrement.");
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
router.use('/superviseur', superviseurRoutes); // LIAISON DU COMMANDEMENT

router.use((req, res) => {
    res.status(404).render('pages/404', { message: 'Page introuvable', title: '404' });
});

module.exports = router;