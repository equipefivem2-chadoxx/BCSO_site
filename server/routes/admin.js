const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const Ticket = require('../models/Ticket'); // 🚀 Nécessaire pour la Purge

// Middleware de sécurité ABSOLUE : Réservé aux Admins
const checkAdmin = async (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');
    
    // 1. Si super-admin ou rôle 'admin' global (Discord)
    if (user.role === 'admin' || user.id === '1247264549489610897') {
        return next();
    }

    // 2. Si le joueur a été mis "Admin du Site" via le panel Haut Commandement
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

// 1. Afficher la page d'administration
router.get('/', async (req, res) => {
    try {
        const agents = await Agent.find().sort({ grade: 1, matricule: 1 });
        const archivesCount = await Ticket.countDocuments(); // Compteur pour la zone de danger
        
        res.render('pages/admin', { 
            title: 'BCSO - Haut Commandement',
            agents: agents,
            archivesCount: archivesCount
        });
    } catch (error) {
        console.error('Erreur de chargement Admin:', error);
        res.render('pages/admin', { title: 'BCSO - Haut Commandement', agents: [], archivesCount: 0 });
    }
});

// 2. Traiter le formulaire d'ajout d'un agent
router.post('/ajouter', async (req, res) => {
    try {
        const { prenom, nom, matricule, grade, telephone, discordId, isAdmin } = req.body;
        
        const nouvelAgent = new Agent({
            prenom,
            nom,
            matricule,
            grade,
            telephone: telephone || "Non renseigné",
            discordId: discordId || '',
            isAdmin: isAdmin === 'on' ? true : false // La case à cocher renvoie 'on' si cochée
        });

        await nouvelAgent.save();
        res.redirect('/admin'); 
        
    } catch (error) {
        console.error('Erreur lors de la création de l\'agent:', error);
        res.redirect('/admin?error=1');
    }
});

// 3. Supprimer un agent
router.post('/supprimer/:id', async (req, res) => {
    try {
        await Agent.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (error) {
        console.error('Erreur de suppression:', error);
        res.redirect('/admin');
    }
});

// 4. Modifier un agent
router.post('/modifier/:id', async (req, res) => {
    try {
        const { prenom, nom, matricule, grade, telephone, discordId, isAdmin } = req.body;
        await Agent.findByIdAndUpdate(req.params.id, {
            prenom, 
            nom, 
            matricule, 
            grade, 
            telephone: telephone || "Non renseigné",
            discordId,
            isAdmin: isAdmin === 'on' ? true : false
        });
        res.redirect('/admin');
    } catch (error) {
        console.error('Erreur de modification:', error);
        res.redirect('/admin');
    }
});

// 🚀 5. ZONE DE DANGER : Purger tous les rapports d'opération
router.post('/purge-rapports', async (req, res) => {
    try {
        await Ticket.deleteMany({}); // Supprime TOUT le contenu de la collection Ticket
        res.redirect('/admin?purge=success');
    } catch (error) {
        console.error('Erreur de purge des rapports:', error);
        res.redirect('/admin?error=purge');
    }
});

module.exports = router;