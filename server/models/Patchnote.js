const mongoose = require('mongoose');

const patchnoteSchema = new mongoose.Schema({
    contenu: { type: String, required: true },
    auteur: { type: String, default: 'ChadoxX' },
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patchnote', patchnoteSchema);