const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

// Route principale : Tableau et recherche
router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        let query = {};
        const { search, filterType, date } = req.query;

        if (search && search.trim() !== '') {
            const regex = new RegExp(search, 'i');
            if (filterType === 'agent') {
                query.closedBy = regex;
            } else if (filterType === 'motif') {
                query.motif = regex;
            } else {
                query.$or = [{ channelName: regex }, { openedBy: regex }];
            }
        }

        if (date && date.trim() !== '') {
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            query.dateCreation = { $gte: start, $lt: end };
        }

        const tickets = await Ticket.find(query).sort({ dateCreation: -1 });

        res.render('pages/archives', {
            title: 'BCSO - Archives & Transcriptions',
            tickets: tickets,
            filters: req.query
        });
    } catch (error) {
        console.error('Erreur affichage archives:', error);
        res.redirect('/dashboard');
    }
});

// 🚀 NOUVELLE ROUTE : Affichage de la page MDT complète du dossier
router.get('/:ticketId', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const ticket = await Ticket.findOne({ channelName: req.params.ticketId });
        
        if (!ticket) {
            return res.status(404).render('pages/404', { message: 'Dossier introuvable', title: '404' });
        }

        res.render('pages/archive-detail', {
            title: `Dossier #${ticket.channelName}`,
            ticket: ticket
        });
    } catch (error) {
        console.error('Erreur ouverture dossier:', error);
        res.redirect('/archives');
    }
});

module.exports = router;