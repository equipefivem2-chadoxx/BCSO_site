const express = require('express');
const router = express.Router();
const Saisie = require('../models/Saisie');
const Agent = require('../models/Agent');

// 1. PAGE PRINCIPALE : Affiche la liste des saisies avec RECHERCHE et PAGINATION
router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        // Paramètres de pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 12; // Nombre de saisies par page
        const skip = (page - 1) * limit;

        // Construction du filtre de recherche
        let query = {};

        // Recherche globale (Suspect, Agent, N° Série, Intitulé)
        if (req.query.search && req.query.search.trim() !== '') {
            const searchRegex = new RegExp(req.query.search.trim(), 'i'); // 'i' pour insensible à la casse
            query.$or = [
                { suspect: searchRegex },
                { agentNom: searchRegex },
                { numeroSerie: searchRegex },
                { intitule: searchRegex }
            ];
        }

        // Filtre par Type
        if (req.query.type && req.query.type !== 'Tous') {
            query.typeSaisie = req.query.type;
        }

        // Filtre par Statut
        if (req.query.statut && req.query.statut !== 'Tous') {
            query.statut = req.query.statut;
        }

        // Ordre de tri (Date)
        let sort = { date: -1 }; // Par défaut : du plus récent au plus ancien
        if (req.query.dateOrder === 'asc') {
            sort.date = 1; // Du plus ancien au plus récent
        }

        // Exécution de la requête avec les filtres, le tri et la pagination
        const totalSaisies = await Saisie.countDocuments(query);
        const totalPages = Math.ceil(totalSaisies / limit) || 1;
        const saisies = await Saisie.find(query).sort(sort).skip(skip).limit(limit);

        res.render('pages/saisie', { 
            title: 'BCSO - Saisies & Scellés',
            user: req.session.user,
            saisies: saisies,
            currentPage: page,
            totalPages: totalPages,
            queryParams: req.query // On renvoie les paramètres pour garder les filtres affichés
        });
    } catch (err) {
        console.error("Erreur lors du chargement de la page saisie:", err);
        res.status(500).send("ERREUR CRITIQUE DANS SAISIE.EJS : " + err.message); 
    }
});

// 2. PAGE DÉCLARATION : Affiche le formulaire
router.get('/declarer', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        res.render('pages/declarer-saisie', { 
            title: 'BCSO - Déclarer une Saisie',
            user: req.session.user
        });
    } catch (err) {
        console.error("Erreur lors du chargement du formulaire:", err);
        res.redirect('/saisie');
    }
});

// 3. ACTION : Sauvegarder la saisie
router.post('/ajouter', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });
        const nomAgent = agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username;

        const nouvelleSaisie = new Saisie({
            agentNom: nomAgent,
            suspect: req.body.suspect || 'Inconnu',
            typeSaisie: req.body.typeSaisie,
            intitule: req.body.intitule,
            quantite: req.body.quantite || 1,
            numeroSerie: req.body.numeroSerie || 'N/A',
            photoUrl: req.body.photoUrl || ''
        });

        await nouvelleSaisie.save();
        res.redirect('/saisie?success=1');
    } catch (err) {
        console.error("Erreur ajout saisie:", err);
        res.redirect('/saisie/declarer?error=1');
    }
});

// 4. ACTION : Changer le statut (Détruire / Restituer)
router.post('/statut/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        await Saisie.findByIdAndUpdate(req.params.id, { statut: req.body.statut });
        // On redirige vers la page précédente pour ne pas perdre la recherche en cours
        const referer = req.get('Referrer') || '/saisie';
        res.redirect(referer);
    } catch (err) {
        console.error("Erreur changement statut:", err);
        res.redirect('/saisie');
    }
});

module.exports = router;