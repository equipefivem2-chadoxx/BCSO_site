const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Agent = require('../models/Agent'); 

// 🚀 AFFICHAGE DE LA LISTE DES ARCHIVES
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

        let agentConnecte = null;
        if (req.session.user && req.session.user.id) {
            agentConnecte = await Agent.findOne({ discordId: req.session.user.id });
        }

        res.render('pages/archives', {
            title: 'BCSO - Archives & Transcriptions',
            tickets: tickets,
            filters: req.query,
            agentConnecte: agentConnecte 
        });
    } catch (error) {
        console.error('Erreur affichage archives:', error);
        res.redirect('/dashboard');
    }
});

// 🚀 AFFICHAGE DU DÉTAIL D'UNE ARCHIVE
router.get('/:ticketId', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        let ticket;
        
        // Recherche par ID unique de base de données
        if (req.params.ticketId.match(/^[0-9a-fA-F]{24}$/)) {
            ticket = await Ticket.findById(req.params.ticketId);
        } else {
            // Rétrocompatibilité par nom de channel
            ticket = await Ticket.findOne({ channelName: req.params.ticketId }).sort({ dateCreation: -1 });
        }
        
        if (!ticket) {
            return res.status(404).render('pages/404', { message: 'Dossier introuvable', title: '404' });
        }

        // Récupération de l'agent pour synchroniser les permissions d'affichage du bouton de suppression
        let agentConnecte = null;
        if (req.session.user && req.session.user.id) {
            agentConnecte = await Agent.findOne({ discordId: req.session.user.id });
        }

        res.render('pages/archive-detail', {
            title: `Dossier #${ticket.channelName}`,
            ticket: ticket,
            user: req.session.user,
            agentConnecte: agentConnecte
        });
    } catch (error) {
        console.error('Erreur ouverture dossier:', error);
        res.redirect('/archives');
    }
});

// 🚀 ROUTE DE SUPPRESSION SÉCURISÉE VIA LA BASE DE DONNÉES
router.post('/supprimer/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const agentConnecte = await Agent.findOne({ discordId: req.session.user.id });
        
        if (agentConnecte && (agentConnecte.canDeleteArchives || agentConnecte.isAdmin)) {
            console.log(`✅ Suppression validée de l'archive ID: ${req.params.id} par ${agentConnecte.prenom} ${agentConnecte.nom}`);
            await Ticket.findByIdAndDelete(req.params.id);
        } else {
            console.log(`⛔ Action refusée : Droits insuffisants pour supprimer.`);
        }
    } catch (error) {
        console.error('❌ Erreur lors de la suppression du dossier:', error);
    }
    
    res.redirect('/archives');
});

module.exports = router;