const mongoose = require('mongoose');

const critereFLSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    etat: { 
        type: String, 
        enum: ['Acquis', 'Partiellement acquis', 'Non acquis', 'Non évalué'],
        default: 'Non évalué'
    },
    remarque: { type: String, default: '' }
}, { _id: false });

const ficheLiaisonSchema = new mongoose.Schema({
    evaluateurId: { type: String, required: true },
    nomEvaluateur: { type: String, required: true },
    gradeEvaluateur: { type: String, required: true },
    
    agentEvalueId: { type: String, required: true },
    nomAgentEvalue: { type: String, required: true },
    matriculeAgentEvalue: { type: String, required: true },
    
    datePassage: { type: String, required: true },
    
    criteres: [critereFLSchema],
    
    commentaireEvaluateur: { type: String, required: true },
    
    decision: { 
        type: String, 
        enum: ['Apte', 'Inapte'], 
        required: true 
    },
    
    statut: { 
        type: String, 
        enum: ['en_attente', 'traitee'], 
        default: 'en_attente' 
    },
    
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FicheLiaison', ficheLiaisonSchema);