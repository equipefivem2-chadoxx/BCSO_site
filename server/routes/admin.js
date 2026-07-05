const express = require('express');
const router = express.Router();

const Agent = require('../models/Agent');
const Ticket = require('../models/Ticket');

const { requireAdmin } = require('../middleware/checkAuth');

// 🔒 Protection globale
router.use(requireAdmin);

//
// 📌 PAGE ADMIN
//
router.get('/', async (req, res) => {
    try {
        const agents = await Agent.find().sort({ matricule: 1 });
        const archivesCount = await Ticket.countDocuments();

        res.render('pages/admin', {
            title: 'BCSO - Haut Commandement',
            agents,
            archivesCount
        });

    } catch (err) {
        console.error(err);
        res.render('pages/admin', {
            title: 'BCSO - Haut Commandement',
            agents: [],
            archivesCount: 0
        });
    }
});

//
// ➕ AJOUT AGENT
//
router.post('/ajouter', async (req, res) => {
    try {
        const { prenom, nom, matricule, grade, telephone, discordId, isAdmin } = req.body;

        const agent = new Agent({
            prenom,
            nom,
            matricule,
            grade,
            telephone: telephone || "Non renseigné",
            discordId: discordId || null,
            isAdmin: isAdmin === 'on'
        });

        await agent.save();

        res.redirect('/admin');

    } catch (err) {
        console.error('Ajout agent error:', err);
        res.redirect('/admin?error=add');
    }
});

//
// ✏️ MODIFIER AGENT
//
router.post('/modifier/:id', async (req, res) => {
    try {
        const { prenom, nom, matricule, grade, telephone, discordId, isAdmin } = req.body;

        await Agent.findByIdAndUpdate(req.params.id, {
            prenom,
            nom,
            matricule,
            grade,
            telephone: telephone || "Non renseigné",
            discordId: discordId || null,
            isAdmin: isAdmin === 'on'
        });

        res.redirect('/admin');

    } catch (err) {
        console.error('Update agent error:', err);
        res.redirect('/admin?error=update');
    }
});

//
// 🗑 SUPPRIMER AGENT
//
router.post('/supprimer/:id', async (req, res) => {
    try {
        await Agent.findByIdAndDelete(req.params.id);
        res.redirect('/admin');

    } catch (err) {
        console.error('Delete agent error:', err);
        res.redirect('/admin?error=delete');
    }
});

//
// 🚨 PURGE RAPPORTS (TRÈS SÉCURISÉ)
//
router.post('/purge-rapports', async (req, res) => {
    try {
        await Ticket.deleteMany({});
        res.redirect('/admin?purge=success');

    } catch (err) {
        console.error('Purge error:', err);
        res.redirect('/admin?error=purge');
    }
});

module.exports = router;