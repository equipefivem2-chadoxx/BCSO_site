const mongoose = require('mongoose');

const SaisieSchema = new mongoose.Schema({
    agentNom: { type: String, required: true },
    suspect: { type: String, required: true },
    typeSaisie: { 
        type: String, 
        enum: ['Arme', 'Drogue', 'Argent Sale', 'Objet Illégal', 'Autre'], 
        required: true 
    },
    intitule: { type: String, required: true },
    quantite: { type: Number, default: 1 },
    numeroSerie: { type: String, default: 'N/A' },
    photoUrl: { type: String, default: '' }, // Juste l'URL pour ne pas surcharger la BDD
    statut: { 
        type: String, 
        enum: ['Sous scellé', 'Détruit', 'Restitué'], 
        default: 'Sous scellé' 
    },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Saisie', SaisieSchema);