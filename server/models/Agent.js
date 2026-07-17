const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    discordId: { 
        type: String, 
        required: false 
    },
    prenom: { type: String, required: true },
    nom: { type: String, required: true },
    matricule: { type: String, required: true, unique: true },
    telephone: { type: String, required: false, default: "Non renseigné" },
    isAdmin: { type: Boolean, default: false },
    canDeleteArchives: { type: Boolean, default: false },
    // 🚀 NOUVEAU : Compteur total de passages effectués par cet agent
    passagesTotal: { type: Number, default: 0 },
    grade: { 
        type: String, 
        required: true,
        enum: [
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