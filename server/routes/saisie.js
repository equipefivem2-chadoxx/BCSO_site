const express = require('express');
const router = express.Router();
const Saisie = require('../models/Saisie');
const Agent = require('../models/Agent');

// 1. PAGE PRINCIPALE : Affiche la liste des saisies (fichier saisie.ejs) -> URL : /saisie
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
        console.error(err);
        res.redirect('/dashboard');
    }
});

// 2. LA ROUTE MANQUANTE : Affiche le formulaire (fichier declarer-saisie.ejs) -> URL : /saisie/declarer
router.get('/declarer', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    // C'EST ICI QU'ON APPELLE TON FICHIER declarer-saisie.ejs
    res.render('pages/declarer-saisie', { 
        title: 'BCSO - Déclarer une Saisie',
        user: req.session.user
    });
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
        // On redirige vers la liste des saisies avec un message de succès
        res.redirect('/saisie?success=1');
    } catch (err) {
        console.error("Erreur ajout saisie:", err);
        res.redirect('/saisie/declarer?error=1');
    }
});

// 4. ACTION : Changer le statut (Détruire / Restituer)
router.post('/statut/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        await Saisie.findByIdAndUpdate(req.params.id, { statut: req.body.statut });
        res.redirect('/saisie');
    } catch (err) {
        res.redirect('/saisie');
    }
});

module.exports = router;