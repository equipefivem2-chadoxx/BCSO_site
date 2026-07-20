const mongoose = require('mongoose');

const banniSchema = new mongoose.Schema({
    nomPrenom: {
        type: String,
        required: true
    },
    motif: {
        type: String,
        required: true
    },
    dateBannissement: {
        type: Date,
        default: Date.now
    },
    agentId: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Banni', banniSchema);