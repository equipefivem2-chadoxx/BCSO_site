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

        // 🚀 NOUVEAU : On vérifie si l'entreprise connectée est un garage (Manono, etc.)
        const identifiant = req.session.entreprise.identifiant.toLowerCase();
        const isGarage = identifiant.includes('manono') || identifiant.includes('garage');

        res.render('pages/entreprise/annuaire', {
            title: `Annuaire BCSO - ${req.session.entreprise.nom}`,
            agents: agents,
            isGarage: isGarage, // Indique à l'EJS d'afficher ou non la colonne des passages
            entrepriseId: req.session.entreprise._id, // Nécessaire pour trouver le bon compteur dans l'EJS
            layout: 'layout-entreprise'
        });
    } catch (err) {
        res.redirect('/entreprise/dashboard');
    }
});

// 🚀 5. CORRIGÉ : Route pour incrémenter/décrémenter les passages SPÉCIFIQUES à l'entreprise
router.post('/passage/:agentId', async (req, res) => {
    try {
        const action = req.body.action; // 'plus' ou 'minus'
        
        // Récupérer l'agent concerné
        let agent = await Agent.findById(req.params.agentId);
        if (!agent) return res.json({ success: false, message: "Agent introuvable" });

        // Récupérer l'entreprise connectée
        let entreprise = await Entreprise.findById(req.session.entreprise._id);
        const entId = req.session.entreprise._id;

        // 🚀 On cherche si l'agent a déjà un compteur pour CETTE entreprise dans son nouveau tableau
        let passageIndex = agent.passagesParEntreprise.findIndex(p => p.entrepriseId.toString() === entId.toString());

        // 🚀 Mise à jour des compteurs
        if (action === 'plus') {
            if (passageIndex > -1) {
                // S'il a déjà un compteur pour ce garage, on fait +1
                agent.passagesParEntreprise[passageIndex].total += 1;
            } else {
                // Sinon, on crée l'entrée pour ce garage avec total = 1
                agent.passagesParEntreprise.push({ entrepriseId: entId, total: 1 });
                passageIndex = agent.passagesParEntreprise.length - 1; // On met à jour l'index
            }
            
            // On met aussi à jour le total global de l'agent et de l'entreprise (pour les stats globales du BCSO)
            agent.passagesTotal = (agent.passagesTotal || 0) + 1;
            if (entreprise) entreprise.totalPassages = (entreprise.totalPassages || 0) + 1;
            
        } else if (action === 'minus') {
            // On décrémente uniquement s'il a déjà un compteur pour cette entreprise et qu'il est > 0
            if (passageIndex > -1 && agent.passagesParEntreprise[passageIndex].total > 0) {
                agent.passagesParEntreprise[passageIndex].total -= 1;
                
                // On retire aussi 1 au total global
                if (agent.passagesTotal > 0) agent.passagesTotal -= 1;
                if (entreprise && entreprise.totalPassages > 0) entreprise.totalPassages -= 1;
            }
        }
        
        // On sauvegarde les modifications en base de données
        await agent.save();
        if (entreprise) await entreprise.save();

        // On renvoie la NOUVELLE valeur spécifique à l'entreprise à l'interface (pour mettre à jour le chiffre direct sans recharger la page)
        const nouvelleValeur = passageIndex > -1 ? agent.passagesParEntreprise[passageIndex].total : 0;
        res.json({ success: true, nouvelAgentTotal: nouvelleValeur });

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