const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');

// Middleware de sécurité ABSOLUE : Réservé aux Admins et au Super-Admin
const checkAdmin = (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');
    
    // Si l'utilisateur a le rôle admin OU s'il a ton ID Discord précis, il passe.
    if (user.role === 'admin' || user.id === '1247264549489610897') {
        return next();
    }
    
    // Sinon, on le dégage vers le dashboard
    return res.redirect('/dashboard');
};

// On applique la sécurité à TOUTES les routes de ce fichier
router.use(checkAdmin);

// 1. Afficher la page d'administration
router.get('/', async (req, res) => {
    try {
        // On récupère tous les agents créés, du plus récent au plus ancien
        const agents = await Agent.find().sort({ dateCreation: -1 });
        
        res.render('pages/admin', { 
            title: 'BCSO - Administration',
            agents: agents
        });
    } catch (error) {
        console.error('Erreur de chargement Admin:', error);
        res.render('pages/admin', { title: 'BCSO - Administration', agents: [] });
    }
});

// 2. Traiter le formulaire d'ajout d'un agent
router.post('/ajouter', async (req, res) => {
    try {
        const { prenom, nom, matricule, grade, discordId } = req.body;
        
        const nouvelAgent = new Agent({
            prenom: prenom,
            nom: nom,
            matricule: matricule,
            grade: grade,
            discordId: discordId || '' // Optionnel
        });

        await nouvelAgent.save();
        res.redirect('/admin'); // On recharge la page pour voir le nouvel agent
        
    } catch (error) {
        console.error('Erreur lors de la création de l\'agent:', error);
        res.redirect('/admin?error=1');
    }
});

module.exports = router;