const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Agent = require('../models/Agent'); // 🚀 NOUVEAU : On importe le modèle Agent

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

        // 🚀 NOUVEAU : On cherche l'agent en base de données pour vérifier ses droits (bouton corbeille EJS)
        let agentConnecte = null;
        if (req.session.user && req.session.user.id) {
            agentConnecte = await Agent.findOne({ discordId: req.session.user.id });
        }

        res.render('pages/archives', {
            title: 'BCSO - Archives & Transcriptions',
            tickets: tickets,
            filters: req.query,
            agentConnecte: agentConnecte // On envoie l'agent à la vue EJS
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

// 🚀 NOUVEAU : Route de suppression mise à jour (renommée en /supprimer pour matcher l'EJS)
router.post('/supprimer/:id', async (req, res) => {
    // 1. Vérification de connexion de base
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        // 2. On récupère l'agent lié à la session
        const agentConnecte = await Agent.findOne({ discordId: req.session.user.id });
        
        // 3. On vérifie les vraies permissions via le modèle Agent
        if (agentConnecte && (agentConnecte.canDeleteArchives || agentConnecte.isAdmin)) {
            console.log(`Tentative de suppression de l'archive ID: ${req.params.id} par ${agentConnecte.prenom} ${agentConnecte.nom}`);
            
            // Suppression dans la base de données
            const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
            
            if (deletedTicket) {
                console.log('✅ Dossier supprimé avec succès.');
            } else {
                console.log('❌ Erreur : Dossier introuvable dans la base de données.');
            }
        } else {
            console.log(`⛔ Action refusée : L'agent ${req.session.user.username} n'a pas les droits requis.`);
        }
    } catch (error) {
        console.error('❌ Erreur critique lors de la suppression du dossier:', error);
    }
    
    // 4. Redirection vers la liste des archives
    res.redirect('/archives');
});

module.exports = router;