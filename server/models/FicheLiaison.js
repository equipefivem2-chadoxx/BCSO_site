const mongoose = require('mongoose');

const ficheLiaisonSchema = new mongoose.Schema({
    auteurId: { type: String, required: true },
    nomAuteur: { type: String, required: true },
    gradeAuteur: { type: String, required: true },
    
    sujet: { type: String, required: true },
    departementConcerne: { type: String, required: true },
    description: { type: String, required: true },
    
    statut: { 
        type: String, 
        enum: ['en_attente', 'traitee'], 
        default: 'en_attente' 
    },
    
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FicheLiaison', ficheLiaisonSchema);