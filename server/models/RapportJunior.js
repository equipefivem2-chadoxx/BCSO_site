const mongoose = require('mongoose');

const rapportJuniorSchema = new mongoose.Schema({
    instructeurId: { type: String, required: true },
    instructeurNom: { type: String, required: true },
    rookieId: { type: String, required: true },
    rookieNom: { type: String, required: true },
    
    // Compétences évaluées
    evalMiseEnDanger: { type: String, default: 'Non Evalué' },
    analyseSituation: { type: String, default: 'Non Evalué' },
    fluiditeRadio: { type: String, default: 'Non Evalué' },
    reponseSystematique: { type: String, default: 'Non Evalué' },
    reponseRapide: { type: String, default: 'Non Evalué' },
    tenirPoursuite: { type: String, default: 'Non Evalué' },
    coherence1020: { type: String, default: 'Non Evalué' },
    gestionDispatch: { type: String, default: 'Non Evalué' },
    respectCodeRoute: { type: String, default: 'Non Evalué' },
    controleRoutier: { type: String, default: 'Non Evalué' },
    gestionArrestation: { type: String, default: 'Non Evalué' },
    redactionRapport: { type: String, default: 'Non Evalué' },
    impartialite: { type: String, default: 'Non Evalué' },
    contactProximite: { type: String, default: 'Non Evalué' },
    
    // Remarque générale
    remarques: { type: String, default: '' },
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RapportJunior', rapportJuniorSchema);