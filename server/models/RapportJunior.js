const mongoose = require('mongoose');

const critereSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    etat: { 
        type: String, 
        enum: ['Acquis', 'Partiellement Acquis', 'Non Acquis', 'Non Evalué'],
        default: 'Non Evalué'
    },
    remarque: { type: String, default: '' }
}, { _id: false });

const rapportJuniorSchema = new mongoose.Schema({
    evaluateurId: { type: String, required: true }, // L'ID MongoDB ou Discord de l'évaluateur
    nomEvaluateur: { type: String, required: true },
    gradeEvaluateur: { type: String, required: true },
    
    juniorId: { type: String, required: true }, // L'ID MongoDB du Junior évalué
    nomJunior: { type: String, required: true },
    matriculeJunior: { type: String, required: true },

    criteres: [critereSchema], // Tableau contenant chaque critère évalué
    
    remarqueGlobale: { type: String, default: '' },
    avis: { 
        type: String, 
        enum: ['Favorable', 'Défavorable', 'Réservé'], 
        required: true 
    },
    
    statut: { 
        type: String, 
        enum: ['en_attente', 'valide'], 
        default: 'en_attente' 
    },
    
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RapportJunior', rapportJuniorSchema);