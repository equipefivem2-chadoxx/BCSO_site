const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

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

router.get('/:ticketId', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        let ticket;
        
        // 🚀 CORRECTION : On cherche d'abord par l'ID unique (qui ne fait jamais de doublons)
        if (req.params.ticketId.match(/^[0-9a-fA-F]{24}$/)) {
            ticket = await Ticket.findById(req.params.ticketId);
        } else {
            // Sécurité pour la rétrocompatibilité (si un lien a gardé l'ancien format, on prend le plus récent)
            ticket = await Ticket.findOne({ channelName: req.params.ticketId }).sort({ dateCreation: -1 });
        }
        
        if (!ticket) {
            return res.status(404).render('pages/404', { message: 'Dossier introuvable', title: '404' });
        }

        res.render('pages/archive-detail', {
            title: `Dossier #${ticket.channelName}`,
            ticket: ticket,
            user: req.session.user
        });
    } catch (error) {
        console.error('Erreur ouverture dossier:', error);
        res.redirect('/archives');
    }
});

router.post('/delete/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    const gradesAutorises = ['admin', 'Sheriff', 'Lieutenant', 'Sergeant Chef', 'Sergeant II', 'Sergeant I'];
    const userGrade = req.session.user.grade || req.session.user.role || '';
    
    if (gradesAutorises.includes(userGrade) || gradesAutorises.includes('admin')) {
        try {
            await Ticket.findByIdAndDelete(req.params.id);
        } catch (error) {
            console.error('Erreur lors de la suppression du dossier:', error);
        }
    }
    
    res.redirect('/archives');
});

module.exports = router;