const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const Entreprise = require('../models/Entreprise');

// 🚀 Middleware de vérification de session entreprise
const checkEntreprise = (req, res, next) => {
    if (!req.session.entreprise) {
        return res.redirect('/entreprise/login');
    }
    // Rend l'objet entreprise disponible dans toutes les vues
    res.locals.entreprise = req.session.entreprise;
    next();
};

// 1. Page de connexion
router.get('/login', (req, res) => {
    if (req.session.entreprise) return res.redirect('/entreprise/dashboard');
    res.render('pages/login-entreprise', { 
        title: 'BCSO - Connexion Partenaire',
        error: req.query.error,
        layout: false 
    });
});

router.post('/login', async (req, res) => {
    try {
        const { identifiant, motDePasse } = req.body;
        const entreprise = await Entreprise.findOne({ identifiant, motDePasse });
        if (!entreprise) return res.redirect('/entreprise/login?error=1');
        
        req.session.entreprise = entreprise;
        res.redirect('/entreprise/dashboard');
    } catch (err) {
        console.error("Erreur login entreprise :", err);
        res.redirect('/entreprise/login?error=1');
    }
});

// 🚀 Applique le middleware sur toutes les routes ci-dessous
router.use(checkEntreprise);

// 2. Dashboard Accueil
router.get('/dashboard', (req, res) => {
    res.render('pages/entreprise/dashboard', {
        title: `Dashboard - ${req.session.entreprise.nom}`,
        layout: 'layout-entreprise' // 🚨 Utilise le layout partenaire
    });
});

// 3. Page Contrat (En développement)
router.get('/contrat', (req, res) => {
    res.render('pages/entreprise/contrat', {
        title: `Contrat - ${req.session.entreprise.nom}`,
        layout: 'layout-entreprise'
    });
});

// 4. Annuaire BCSO
router.get('/annuaire', async (req, res) => {
    try {
        const agents = await Agent.find();
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

        res.render('pages/entreprise/annuaire', {
            title: `Annuaire BCSO - ${req.session.entreprise.nom}`,
            agents: agents,
            isEntreprise: true, // 🚀 NOUVEAU: Indique à l'EJS d'afficher la colonne des passages
            layout: 'layout-entreprise'
        });
    } catch (err) {
        res.redirect('/entreprise/dashboard');
    }
});

// 🚀 5. NOUVEAU : Route pour incrémenter/décrémenter les passages
router.post('/passage/:agentId', async (req, res) => {
    try {
        const action = req.body.action; // 'plus' ou 'minus'
        
        // Récupérer l'agent concerné
        let agent = await Agent.findById(req.params.agentId);
        if (!agent) return res.json({ success: false, message: "Agent introuvable" });

        // Récupérer l'entreprise connectée
        let entreprise = await Entreprise.findById(req.session.entreprise._id);

        // 🚀 On met à jour les deux compteurs
        if (action === 'plus') {
            agent.passagesTotal = (agent.passagesTotal || 0) + 1;
            if (entreprise) entreprise.totalPassages = (entreprise.totalPassages || 0) + 1;
        } else if (action === 'minus' && agent.passagesTotal > 0) {
            agent.passagesTotal -= 1;
            if (entreprise && entreprise.totalPassages > 0) entreprise.totalPassages -= 1;
        }
        
        // On sauvegarde les modifications en base de données
        await agent.save();
        if (entreprise) await entreprise.save();

        // On renvoie la nouvelle valeur à l'interface (pour le compteur en direct)
        res.json({ success: true, nouvelAgentTotal: agent.passagesTotal });

    } catch (err) {
        console.error("Erreur mise à jour passage:", err);
        res.json({ success: false, message: "Erreur serveur" });
    }
});

// 6. Déconnexion
router.get('/logout', (req, res) => {
    delete req.session.entreprise;
    res.redirect('/entreprise/login');
});

module.exports = router;