const mongoose = require('mongoose');

const saisieSchema = new mongoose.Schema({
    agentNom: {
        type: String,
        required: true
    },
    suspect: {
        type: String,
        default: 'Inconnu'
    },
    typeSaisie: {
        type: String,
        required: true
    },
    intitule: {
        type: String,
        required: true
    },
    quantite: {
        type: Number,
        default: 1
    },
    numeroSerie: {
        type: String,
        default: 'N/A'
    },
    photoUrl: {
        type: String,
        default: ''
    },
    statut: {
        type: String,
        default: 'Stocké' // Statut par défaut (changera en "Détruire" ou "Restituer" via ton bouton)
    },
    date: {
        type: Date,
        default: Date.now // Nécessaire car tu tries par date dans tes routes
    }
});

module.exports = mongoose.model('Saisie', saisieSchema);