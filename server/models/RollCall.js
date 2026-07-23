const mongoose = require('mongoose');

const rollCallSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // Format attendu: "23/07/26"
    reponses: [{
        discordId: { type: String, required: true },
        status: { 
            type: String, 
            enum: ['present', 'absent', 'retard'], 
            required: true 
        },
        heureReponse: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('RollCall', rollCallSchema);