const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/checkAuth');

// 🚀 Route 1 : Afficher la timeline publique des patchnotes
router.get('/', requireAuth, async (req, res) => {
    try {
        const Patchnote = require('../models/Patchnote');
        const patchnotes = await Patchnote.find().sort({ dateCreation: -1 });

        res.render('pages/patchnotes', {
            title: 'BCSO - Patchnotes & Mises à jour',
            user: req.session.user,
            patchnotes: patchnotes
        });
    } catch (error) {
        console.error('Erreur affichage patchnotes:', error);
        res.redirect('/dashboard');
    }
});

// 🚀 Route 2 : Ajouter un patchnote (Réservé à ChadoxX et Admins)
router.post('/ajouter', requireAuth, async (req, res) => {
    try {
        const discordId = req.session.user.id || req.session.user.discordId;
        const isAuthorised = req.session.user.isAdmin === true || 
                             req.session.user.role === 'admin' || 
                             discordId === '1247264549489610897';

        if (!isAuthorised) {
            return res.status(403).send("Accès refusé : Seul le Haut Commandement ou ChadoxX peut publier un patchnote.");
        }

        const Patchnote = require('../models/Patchnote');
        // On enregistre uniquement le contenu brut et l'auteur
        const nouveauPatchnote = new Patchnote({
            contenu: req.body.contenu,
            auteur: req.session.user.username || 'ChadoxX'
        });

        await nouveauPatchnote.save();
        res.redirect('/patchnotes?success=1');
    } catch (err) {
        console.error("Erreur ajout patchnote:", err);
        res.redirect('/chadoxx?error=patchnote');
    }
});

// 🚀 Route 3 : Supprimer un patchnote (Réservé à ChadoxX et Admins)
router.post('/supprimer/:id', requireAuth, async (req, res) => {
    try {
        const discordId = req.session.user.id || req.session.user.discordId;
        const isAuthorised = req.session.user.isAdmin === true || 
                             req.session.user.role === 'admin' || 
                             discordId === '1247264549489610897';

        if (isAuthorised) {
            const Patchnote = require('../models/Patchnote');
            await Patchnote.findByIdAndDelete(req.params.id);
        }
        res.redirect('/patchnotes');
    } catch (err) {
        console.error("Erreur suppression patchnote:", err);
        res.redirect('/patchnotes');
    }
});

module.exports = router;