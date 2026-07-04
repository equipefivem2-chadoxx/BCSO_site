const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    discordId: { 
        type: String, 
        required: false // Optionnel, au cas où tu crées un agent qui n'est pas encore sur le Discord
    },
    prenom: { type: String, required: true },
    nom: { type: String, required: true },
    matricule: { type: String, required: true, unique: true },
    grade: { 
        type: String, 
        required: true,
        enum: [
            'Admin', 
            'Sheriff', 
            'Lieutenant', 
            'Sergeant Chef', 
            'Sergeant II', 
            'Sergeant I', 
            'SLO', 
            'Deputy III', 
            'Deputy II', 
            'Deputy I', 
            'Deputy Junior'
        ]
    },
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agent', agentSchema);