const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, required: true },
    channelName: { type: String, required: true },
    openedBy: { type: String, required: true }, // Nom Discord ou Matricule de l'auteur
    closedBy: { type: String, required: true }, // Nom de l'agent qui ferme
    motif: { type: String, default: 'Non spécifié' }, // Raison du ticket (Plainte, Vol, Recrutement...)
    messages: [
        {
            author: { type: String, required: true },
            content: { type: String, required: true },
            timestamp: { type: String, required: true }
        }
    ],
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);