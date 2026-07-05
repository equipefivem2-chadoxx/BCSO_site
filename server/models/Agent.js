const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    discordId: { 
        type: String, 
        required: false 
    },
    prenom: { type: String, required: true },
    nom: { type: String, required: true },
    matricule: { type: String, required: true, unique: true },
    // 🚀 NOUVEAU : Numéro de téléphone (In-Game)
    telephone: { type: String, required: false, default: "Non renseigné" },
    // 🚀 NOUVEAU : Gestion des permissions (Séparée du grade RP)
    isAdmin: { type: Boolean, default: false },
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
        ] // 'Admin' a été retiré de la liste des grades RP
    },
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agent', agentSchema);