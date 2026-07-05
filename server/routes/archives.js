const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        let query = {};
        const { search, filterType, date } = req.query;

        // Système de filtrage intelligent et cumulable
        if (search && search.trim() !== '') {
            const regex = new RegExp(search, 'i'); // 'i' pour ignorer les majuscules/minuscules
            if (filterType === 'agent') {
                query.closedBy = regex;
            } else if (filterType === 'motif') {
                query.motif = regex;
            } else {
                // Recherche globale par défaut (Nom du salon ou auteur)
                query.$or = [{ channelName: regex }, { openedBy: regex }];
            }
        }

        // Filtrage précis par date si sélectionnée
        if (date && date.trim() !== '') {
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            query.dateCreation = { $gte: start, $lt: end };
        }

        // On récupère les fiches triées de la plus récente à la plus ancienne
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

module.exports = router;