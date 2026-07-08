const express = require('express');
const router = express.Router();
const Ticket = require('../../models/Ticket');

// Route API sécurisée appelée par le Bot Discord
router.post('/transcript', async (req, res) => {
    try {
        const { ticketId, channelName, openedBy, closedBy, motif, messages } = req.body;
        
        // Sécurité basique : s'assurer que les données minimales sont présentes
        if (!ticketId || !channelName || !messages) {
            return res.status(400).json({ success: false, message: 'Données incomplètes.' });
        }

        const nouveauTicket = new Ticket({
            ticketId,
            channelName,
            openedBy,
            closedBy,
            motif: motif || 'Non spécifié',
            messages
        });

        await nouveauTicket.save();
        return res.status(201).json({ success: true, message: 'Transcription enregistrée avec succès.' });
        
    } catch (error) {
        console.error('Erreur API Transcription:', error);
        return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});

// 🚀 NOUVELLE ROUTE : Le bot envoie le nombre de tickets en cours ici
router.post('/sync-count', (req, res) => {
    try {
        const { count } = req.body;
        
        if (typeof count === 'number') {
            // Sauvegarde dans la mémoire globale d'Express (ultra rapide)
            req.app.locals.ticketsEnCoursCount = count;
            return res.status(200).json({ success: true, message: 'Compteur mis à jour' });
        }
        
        return res.status(400).json({ success: false, message: 'Format invalide' });
    } catch (error) {
        return res.status(500).json({ success: false });
    }
});

// 🚀 ROUTE D'ACTUALISATION EN DIRECT (Interrogée en tâche de fond par le Dashboard)
router.get('/live-data', async (req, res) => {
    try {
        const enCoursCount = req.app.locals.ticketsEnCoursCount || 0;
        const archivesCount = await Ticket.countDocuments();
        
        return res.json({
            success: true,
            ticketsEnCoursCount: enCoursCount,
            ticketsArchivesCount: archivesCount
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des données live:', error);
        return res.status(500).json({ success: false });
    }
});

module.exports = router;