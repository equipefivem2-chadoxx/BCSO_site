const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const Ticket = require('../models/Ticket');
const Entreprise = require('../models/Entreprise'); // 🚀 Modèle Entreprise requis

const checkAdmin = async (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');
    
    if (user.role === 'admin' || user.id === '1247264549489610897') {
        return next();
    }

    try {
        const agent = await Agent.findOne({ discordId: user.id });
        if (agent && agent.isAdmin === true) {
            return next();
        }
    } catch (err) {
        console.error("Erreur vérif admin:", err);
    }
    
    return res.redirect('/dashboard');
};

router.use(checkAdmin);

// 1. Page Admin
router.get('/', async (req, res) => {
    try {
        const agents = await Agent.find();
        
        // 🚀 On récupère les entreprises partenaires pour les afficher sur la page
        const entreprises = await Entreprise.find().sort({ nom: 1 });

        const ordreGrades = [
            'Sheriff', 'Lieutenant', 'Sergeant Chef', 'Sergeant II', 'Sergeant I', 
            'SLO', 'Deputy III', 'Deputy II', 'Deputy I', 'Deputy Junior'
        ];

        agents.sort((a, b) => {
            const indexA = ordreGrades.indexOf(a.grade);
            const indexB = ordreGrades.indexOf(b.grade);
            if (indexA !== indexB) return indexA - indexB;
            return a.matricule.localeCompare(b.matricule, undefined, { numeric: true, sensitivity: 'base' });
        });

        const archivesCount = await Ticket.countDocuments();
        
        res.render('pages/admin', { 
            title: 'BCSO - Haut Commandement',
            agents: agents,
            entreprises: entreprises, // 🚀 Liste passée à la vue
            archivesCount: archivesCount
        });
    } catch (error) {
        console.error('Erreur chargement Admin:', error);
        res.render('pages/admin', { title: 'BCSO - Haut Commandement', agents: [], entreprises: [], archivesCount: 0 });
    }
});

// 2. Gestion des Agents
router.post('/ajouter', async (req, res) => {
    try {
        const { prenom, nom, matricule, grade, telephone, discordId, isAdmin, canDeleteArchives } = req.body;
        const nouvelAgent = new Agent({
            prenom, nom, matricule, grade,
            telephone: telephone || "Non renseigné",
            discordId: discordId || '',
            isAdmin: isAdmin === 'on' ? true : false,
            canDeleteArchives: canDeleteArchives === 'on' ? true : false
        });
        await nouvelAgent.save();
        res.redirect('/admin'); 
    } catch (error) {
        res.redirect('/admin?error=1');
    }
});

router.post('/supprimer/:id', async (req, res) => {
    try {
        await Agent.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (error) {
        res.redirect('/admin');
    }
});

router.post('/modifier/:id', async (req, res) => {
    try {
        const { prenom, nom, matricule, grade, telephone, discordId, isAdmin, canDeleteArchives } = req.body;
        await Agent.findByIdAndUpdate(req.params.id, {
            prenom, nom, matricule, grade,
            telephone: telephone || "Non renseigné",
            discordId,
            isAdmin: isAdmin === 'on' ? true : false,
            canDeleteArchives: canDeleteArchives === 'on' ? true : false
        });
        res.redirect('/admin');
    } catch (error) {
        res.redirect('/admin');
    }
});

// 3. 🚀 GESTION DES COMPTES ENTREPRISES PARTENAIRES
router.post('/entreprise/ajouter', async (req, res) => {
    try {
        const { nom, identifiant, motDePasse } = req.body;
        await Entreprise.create({ nom, identifiant, motDePasse });
        res.redirect('/admin');
    } catch (err) {
        console.error("Erreur création entreprise:", err);
        res.redirect('/admin');
    }
});

router.post('/entreprise/supprimer/:id', async (req, res) => {
    try {
        await Entreprise.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        res.redirect('/admin');
    }
});

// NOUVEAU: Modification des entreprises
router.post('/entreprise/modifier/:id', async (req, res) => {
    try {
        const { nom, identifiant, motDePasse } = req.body;
        await Entreprise.findByIdAndUpdate(req.params.id, { nom, identifiant, motDePasse });
        res.redirect('/admin');
    } catch (err) {
        console.error("Erreur modification entreprise:", err);
        res.redirect('/admin');
    }
});

// 4. Zone de danger
router.post('/purge-rapports', async (req, res) => {
    try {
        await Ticket.deleteMany({});
        res.redirect('/admin?purge=success');
    } catch (error) {
        res.redirect('/admin?error=purge');
    }
});

module.exports = router;