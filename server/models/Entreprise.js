const mongoose = require('mongoose');

const entrepriseSchema = new mongoose.Schema({
    nom: { type: String, required: true }, // Ex: "Weazel News"
    identifiant: { type: String, required: true, unique: true }, // Ex: "weazel_rp"
    motDePasse: { type: String, required: true }, // Mot de passe en clair pour une gestion RP facile par les admins
    // 🚀 NOUVEAU : Compteur global des passages pour cette entreprise
    totalPassages: { type: Number, default: 0 },
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Entreprise', entrepriseSchema);