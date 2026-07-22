const express = require('express');
const router = express.Router();

// 🚀 Route 1 : Affichage du Hub (index.ejs)
router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.render('pages/superviseur/refus', {
                title: 'BCSO - Accès Refusé',
                user: viewUser, 
                currentGrade: currentGrade || 'Non habilité'
            });
        }

        let rapports = [];
        let fichesLiaison = [];
        try {
            const RapportJunior = require('../models/RapportJunior');
            rapports = await RapportJunior.find().sort({ dateCreation: -1 });
            
            const FicheLiaison = require('../models/FicheLiaison');
            fichesLiaison = await FicheLiaison.find({ statut: 'en_attente' }).sort({ dateCreation: -1 });
        } catch (err) {
            console.log("Modèles en attente d'initialisation...");
        }

        // Récupération des stats des passages pour le Dashboard
        const Entreprise = require('../models/Entreprise');
        const entreprisesStats = await Entreprise.find().sort({ totalPassages: -1 });
        const topAgents = await Agent.find({ passagesTotal: { $gt: 0 } }).sort({ passagesTotal: -1 }).limit(10);

        res.render('pages/superviseur/index', { 
            title: 'BCSO - Hub Supervision',
            user: viewUser, 
            rapports: rapports,
            fichesLiaison: fichesLiaison,
            entreprisesStats: entreprisesStats,
            topAgents: topAgents
        });

    } catch (error) {
        console.error('Erreur hub superviseur:', error);
        res.redirect('/dashboard');
    }
});

// 🚀 Route 2 : La liste des évaluations
router.get('/evaluations', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.render('pages/superviseur/refus', {
                title: 'BCSO - Accès Refusé',
                user: viewUser, 
                currentGrade: currentGrade || 'Non habilité'
            });
        }

        const RapportJunior = require('../models/RapportJunior');
        const rapports = await RapportJunior.find().sort({ dateCreation: -1 });

        res.render('pages/superviseur/evaluations', { 
            title: 'BCSO - Évaluations Juniors',
            user: viewUser, 
            rapports: rapports
        });

    } catch (error) {
        console.error('Erreur liste evaluations:', error);
        res.redirect('/superviseur');
    }
});

// 🚀 Route 3 : Lire une évaluation détaillée
router.get('/rapport/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const RapportJunior = require('../models/RapportJunior');
        
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.redirect('/superviseur');
        }

        const rapport = await RapportJunior.findById(req.params.id);
        if (!rapport) return res.redirect('/superviseur');

        res.render('pages/superviseur/rapport-detail', {
            title: `Évaluation - ${rapport.nomJunior}`,
            user: viewUser, 
            rapport: rapport,
            isUserAdmin: isUserAdmin
        });

    } catch (err) {
        console.error("Erreur lecture rapport:", err);
        res.redirect('/superviseur');
    }
});

// 🚀 Route pour changer le statut (Valider)
router.post('/rapport/:id/valider', async (req, res) => {
    try {
        const RapportJunior = require('../models/RapportJunior');
        await RapportJunior.findByIdAndUpdate(req.params.id, { statut: 'valide' });
        res.redirect(`/superviseur/rapport/${req.params.id}`);
    } catch (err) {
        res.redirect('/superviseur');
    }
});

// 🚀 Route pour supprimer UN rapport
router.post('/rapport/:id/supprimer', async (req, res) => {
    try {
        const RapportJunior = require('../models/RapportJunior');
        await RapportJunior.findByIdAndDelete(req.params.id);
        res.redirect('/superviseur/evaluations');
    } catch (err) {
        res.redirect('/superviseur');
    }
});

// 🚀 Route de purge complète (Admins)
router.post('/evaluations/supprimer-tout', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        if (!isUserAdmin) {
            return res.redirect('/superviseur/evaluations');
        }

        const RapportJunior = require('../models/RapportJunior');
        await RapportJunior.deleteMany({});
        res.redirect('/superviseur/evaluations?success=purged');

    } catch (err) {
        console.error("Erreur lors de la purge globale:", err);
        res.redirect('/superviseur/evaluations');
    }
});

// ==============================================================
// 🚀 GESTION DES PARTENARIATS ENTREPRISES
// ==============================================================

// 🚀 Route 4 : Liste des partenariats
router.get('/partenariats', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const Entreprise = require('../models/Entreprise');
        
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.redirect('/superviseur');
        }

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };
        
        const entreprises = await Entreprise.find().sort({ nom: 1 });

        res.render('pages/superviseur/partenariats', { 
            title: 'BCSO - Partenariats',
            user: viewUser, 
            entreprises: entreprises
        });

    } catch (error) {
        console.error('Erreur liste partenariats:', error);
        res.redirect('/superviseur');
    }
});

// 🚀 Route 5 : Détail d'un partenariat
router.get('/partenariats/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const Entreprise = require('../models/Entreprise');
        
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);
                            
        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.redirect('/superviseur');
        }

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        const entreprise = await Entreprise.findById(req.params.id);
        if (!entreprise) return res.redirect('/superviseur/partenariats');

        let agents = await Agent.find({
            passagesParEntreprise: {
                $elemMatch: {
                    entrepriseId: entreprise._id,
                    total: { $gt: 0 }
                }
            }
        });

        agents.sort((a, b) => {
            const passageA = a.passagesParEntreprise.find(p => p.entrepriseId.toString() === entreprise._id.toString());
            const passageB = b.passagesParEntreprise.find(p => p.entrepriseId.toString() === entreprise._id.toString());
            const totalA = passageA ? passageA.total : 0;
            const totalB = passageB ? passageB.total : 0;
            return totalB - totalA; 
        });

        res.render('pages/superviseur/partenariat-detail', { 
            title: `Partenariat - ${entreprise.nom}`,
            user: viewUser, 
            entreprise: entreprise,
            agents: agents
        });

    } catch (error) {
        console.error('Erreur détail partenariat:', error);
        res.redirect('/superviseur/partenariats');
    }
});

// ==============================================================
// 🚀 GESTION DES BANNIS DU NORD
// ==============================================================

// Route pour afficher le panel de gestion
router.get('/bannis', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const Banni = require('../models/Banni');
        
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.redirect('/superviseur');
        }

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        const listeBannis = await Banni.find().sort({ dateBannissement: -1 });

        res.render('pages/superviseur/bannis', { 
            title: 'BCSO - Gestion Bannis',
            user: viewUser, 
            bannis: listeBannis
        });

    } catch (error) {
        console.error('Erreur liste bannis superviseur:', error);
        res.redirect('/superviseur');
    }
});

// Route pour AJOUTER un banni
router.post('/bannis/ajouter', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        const Banni = require('../models/Banni');
        const Agent = require('../models/Agent');
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });
        
        const nomAgent = agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username;

        const nouveauBanni = new Banni({
            nomPrenom: req.body.nomPrenom,
            motif: req.body.motif,
            agentId: nomAgent
        });

        await nouveauBanni.save();
        res.redirect('/superviseur/bannis?success=add');
    } catch (err) {
        console.error('Erreur ajout banni:', err);
        res.redirect('/superviseur/bannis?error=1');
    }
});

// Route pour SUPPRIMER (Révoquer) un banni
router.post('/bannis/supprimer/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        const Banni = require('../models/Banni');
        await Banni.findByIdAndDelete(req.params.id);
        res.redirect('/superviseur/bannis?success=delete');
    } catch (err) {
        console.error('Erreur suppression banni:', err);
        res.redirect('/superviseur/bannis?error=1');
    }
});

// ==============================================================
// 🚀 GESTION DES FICHES DE LIAISON (SUPERVISION)
// ==============================================================

// Lire une fiche de liaison détaillée
router.get('/fl/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const Agent = require('../models/Agent');
        const FicheLiaison = require('../models/FicheLiaison');
        
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });

        const isUserAdmin = req.session.user.isAdmin === true || 
                            req.session.user.role === 'admin' || 
                            discordId === '1247264549489610897' || 
                            (agentDB && agentDB.isAdmin === true);

        const currentGrade = agentDB ? agentDB.grade : req.session.user.grade;
        const gradesSupervision = ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'];

        const viewUser = {
            ...req.session.user,
            grade: currentGrade,
            nom: agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username,
            isAdmin: isUserAdmin
        };

        if (!isUserAdmin && !gradesSupervision.includes(currentGrade)) {
            return res.redirect('/superviseur');
        }

        const fiche = await FicheLiaison.findById(req.params.id);
        if (!fiche) return res.redirect('/superviseur');

        res.render('pages/superviseur/fl-detail', {
            title: `Fiche de Liaison - ${fiche.sujet}`,
            user: viewUser, 
            fiche: fiche,
            isUserAdmin: isUserAdmin
        });

    } catch (err) {
        console.error("Erreur lecture FL:", err);
        res.redirect('/superviseur');
    }
});

// Valider une fiche de liaison
router.post('/fl/:id/valider', async (req, res) => {
    try {
        const FicheLiaison = require('../models/FicheLiaison');
        await FicheLiaison.findByIdAndUpdate(req.params.id, { statut: 'traitee' });
        res.redirect(`/superviseur/fl/${req.params.id}`);
    } catch (err) {
        res.redirect('/superviseur');
    }
});

// Supprimer une fiche de liaison
router.post('/fl/:id/supprimer', async (req, res) => {
    try {
        const FicheLiaison = require('../models/FicheLiaison');
        await FicheLiaison.findByIdAndDelete(req.params.id);
        res.redirect('/superviseur');
    } catch (err) {
        res.redirect('/superviseur');
    }
});

module.exports = router;