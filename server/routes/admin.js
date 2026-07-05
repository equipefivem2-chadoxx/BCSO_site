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

// 1. Afficher la page d'administration avec tri par hiérarchie
router.get('/', async (req, res) => {
    try {
        // On récupère tous les agents
        const agents = await Agent.find();

        // 🚀 Ordre hiérarchique personnalisé (du plus haut au plus bas)
        const ordreGrades = [
            'Sheriff', 
            'Lieutenant', 
            'Sergeant Chef', 
            'Sergeant II', 
            'Sergeant I', 
            'SLO', 
            'Deputy III', 
            'Deputy II', 
            'Deputy I', 
            'Deputy Junior'
        ];

        // Tri des agents en JavaScript
        agents.sort((a, b) => {
            const indexA = ordreGrades.indexOf(a.grade);
            const indexB = ordreGrades.indexOf(b.grade);

            // Si les grades sont différents, on trie selon l'index dans le tableau (le plus bas index = plus haut gradé)
            if (indexA !== indexB) {
                return indexA - indexB;
            }

            // Si le grade est identique, on trie par numéro de matricule (ex: 02 avant 55)
            return a.matricule.localeCompare(b.matricule, undefined, { numeric: true, sensitivity: 'base' });
        });

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
        const { prenom, nom, matricule, grade, telephone, discordId, isAdmin, canDeleteArchives } = req.body;
        
        const nouvelAgent = new Agent({
            prenom,
            nom,
            matricule,
            grade,
            telephone: telephone || "Non renseigné",
            discordId: discordId || '',
            isAdmin: isAdmin === 'on' ? true : false,
            canDeleteArchives: canDeleteArchives === 'on' ? true : false
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
        const { prenom, nom, matricule, grade, telephone, discordId, isAdmin, canDeleteArchives } = req.body;
        await Agent.findByIdAndUpdate(req.params.id, {
            prenom, 
            nom, 
            matricule, 
            grade, 
            telephone: telephone || "Non renseigné",
            discordId,
            isAdmin: isAdmin === 'on' ? true : false,
            canDeleteArchives: canDeleteArchives === 'on' ? true : false
        });
        res.redirect('/admin');
    } catch (error) {
        console.error('Erreur de modification:', error);
        res.redirect('/admin');
    }
});

// 5. ZONE DE DANGER : Purger tous les rapports d'opération
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