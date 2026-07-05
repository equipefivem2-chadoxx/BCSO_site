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

module.exports = router;