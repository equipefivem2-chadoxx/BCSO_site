const express = require('express');
const router = express.Router();
const Saisie = require('../models/Saisie');
const Agent = require('../models/Agent');

// 1. PAGE PRINCIPALE : Affiche la liste des saisies -> URL : /saisie
router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const saisies = await Saisie.find().sort({ date: -1 }).limit(50);
        res.render('pages/saisie', { 
            title: 'BCSO - Saisies & Scellés',
            user: req.session.user,
            saisies: saisies
        });
    } catch (err) {
        console.error("Erreur lors du chargement de la page saisie:", err);
        // ON AFFICHE L'ERREUR A L'ECRAN POUR TROUVER LE PROBLEME DANS TON FICHIER EJS
        res.status(500).send("ERREUR CRITIQUE DANS SAISIE.EJS : " + err.message); 
    }
});

// 2. PAGE DÉCLARATION : Affiche le formulaire -> URL : /saisie/declarer
router.get('/declarer', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        res.render('pages/declarer-saisie', { 
            title: 'BCSO - Déclarer une Saisie',
            user: req.session.user
        });
    } catch (err) {
        console.error("Erreur lors du chargement du formulaire:", err);
        res.redirect('/saisie');
    }
});

// 3. ACTION : Sauvegarder la saisie quand le formulaire est validé -> URL : /saisie/ajouter
router.post('/ajouter', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });
        const nomAgent = agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username;

        const nouvelleSaisie = new Saisie({
            agentNom: nomAgent,
            suspect: req.body.suspect || 'Inconnu',
            typeSaisie: req.body.typeSaisie,
            intitule: req.body.intitule,
            quantite: req.body.quantite || 1,
            numeroSerie: req.body.numeroSerie || 'N/A',
            photoUrl: req.body.photoUrl || ''
        });

        await nouvelleSaisie.save();
        res.redirect('/saisie?success=1');
    } catch (err) {
        console.error("Erreur ajout saisie:", err);
        res.redirect('/saisie/declarer?error=1');
    }
});

// 4. ACTION : Changer le statut (Détruire / Restituer) -> URL : /saisie/statut/:id
router.post('/statut/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        await Saisie.findByIdAndUpdate(req.params.id, { statut: req.body.statut });
        res.redirect('/saisie');
    } catch (err) {
        console.error("Erreur changement statut:", err);
        res.redirect('/saisie');
    }
});

module.exports = router;