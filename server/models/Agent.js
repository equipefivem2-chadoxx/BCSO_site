const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    discordId: { type: String, default: null },

    prenom: { type: String, required: true },
    nom: { type: String, required: true },

    matricule: { type: String, required: true, unique: true },

    telephone: { type: String, default: "Non renseigné" },

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
        ]
    },

    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agent', agentSchema);