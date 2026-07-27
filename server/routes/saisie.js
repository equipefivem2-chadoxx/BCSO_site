const express = require('express');
const router = express.Router();
const Saisie = require('../models/Saisie');
const Agent = require('../models/Agent');

// Middleware de sécurité : Vérifier si l'utilisateur est un superviseur
const isSuperviseur = (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');
    
    const hasAccess = (
        user.isAdmin === true || 
        user.role === 'admin' || 
        user.id === '1247264549489610897' || 
        ['SLO', 'Sergeant I', 'Sergeant II', 'Sergeant Chef', 'Lieutenant', 'Sheriff'].includes(user.grade)
    );

    if (hasAccess) {
        next(); 
    } else {
        res.status(403).send("<h1>Accès Refusé</h1><p>Seuls les superviseurs peuvent consulter le registre des saisies.</p>");
    }
};

// 1. PAGE PRINCIPALE (PROTÉGÉE) : Affiche la liste des saisies
router.get('/', isSuperviseur, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12; 
        const skip = (page - 1) * limit;
        let query = {};

        if (req.query.search && req.query.search.trim() !== '') {
            const searchRegex = new RegExp(req.query.search.trim(), 'i'); 
            query.$or = [
                { suspect: searchRegex },
                { agentNom: searchRegex },
                { numeroSerie: searchRegex },
                { intitule: searchRegex }
            ];
        }
        if (req.query.type && req.query.type !== 'Tous') query.typeSaisie = req.query.type;
        if (req.query.statut && req.query.statut !== 'Tous') query.statut = req.query.statut;

        let sort = { date: -1 };
        if (req.query.dateOrder === 'asc') sort.date = 1; 

        const totalSaisies = await Saisie.countDocuments(query);
        const totalPages = Math.ceil(totalSaisies / limit) || 1;
        const saisies = await Saisie.find(query).sort(sort).skip(skip).limit(limit);

        res.render('pages/saisie', { 
            title: 'BCSO - Registre des Saisies',
            user: req.session.user,
            saisies: saisies,
            currentPage: page,
            totalPages: totalPages,
            queryParams: req.query 
        });
    } catch (err) {
        console.error("Erreur saisies:", err);
        res.status(500).send("Erreur serveur"); 
    }
});

// 🚀 PAGE DÉTAILS D'UNE SAISIE (AVEC PHOTO EN GRAND)
router.get('/detail/:id', isSuperviseur, async (req, res) => {
    try {
        const saisie = await Saisie.findById(req.params.id);
        if (!saisie) return res.redirect('/saisie');

        res.render('pages/saisie-details', {
            title: `BCSO - Saisie #${saisie.intitule}`,
            user: req.session.user,
            saisie: saisie
        });
    } catch (err) {
        console.error("Erreur détail saisie:", err);
        res.redirect('/saisie');
    }
});

// 2. PAGE DÉCLARATION (PUBLIQUE POUR AGENTS) : Affiche le formulaire
router.get('/declarer', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });
        const nomAgent = agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username;

        res.render('pages/declarer-saisie', { 
            title: 'BCSO - Déclarer une Saisie',
            user: req.session.user,
            nomAgent: nomAgent 
        });
    } catch (err) {
        res.redirect('/dashboard'); 
    }
});

// 3. ACTION : Sauvegarder la saisie avec logique de CUMUL par SUSPECT
router.post('/ajouter', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        const discordId = req.session.user.id || req.session.user.discordId;
        const agentDB = await Agent.findOne({ discordId: discordId });
        const nomAgent = agentDB ? `${agentDB.prenom} ${agentDB.nom}` : req.session.user.username;

        const quantiteAjoutee = parseInt(req.body.quantite) || 1;
        const intituleSaisi = req.body.intitule.trim();
        const suspectSaisi = req.body.suspect || 'Inconnu';

        // 🚀 LOGIQUE DE CUMUL : On additionne tout sauf les Armes, et SEULEMENT pour le même suspect
        if (req.body.typeSaisie !== 'Arme') {
            const scelleExistant = await Saisie.findOne({
                typeSaisie: req.body.typeSaisie,
                intitule: { $regex: new RegExp(`^${intituleSaisi}$`, 'i') },
                suspect: { $regex: new RegExp(`^${suspectSaisi}$`, 'i') } // 🔍 DOIT ÊTRE LE MÊME SUSPECT
            });

            if (scelleExistant) {
                // On additionne les quantités
                scelleExistant.quantite += quantiteAjoutee;
                scelleExistant.date = Date.now(); // Actualise la date de la dernière saisie
                
                // Si l'agent a mis une nouvelle photo, on met à jour l'ancienne
                if (req.body.photoUrl && req.body.photoUrl.trim() !== '') {
                    scelleExistant.photoUrl = req.body.photoUrl;
                }
                
                await scelleExistant.save();
                return res.redirect('/saisie/declarer?success=1'); 
            }
        }

        // Si c'est une Arme, ou si le consommable n'existe pas pour CE suspect, on crée une nouvelle carte
        const nouvelleSaisie = new Saisie({
            agentNom: nomAgent,
            suspect: suspectSaisi,
            typeSaisie: req.body.typeSaisie,
            intitule: intituleSaisi,
            quantite: quantiteAjoutee,
            numeroSerie: req.body.numeroSerie || 'N/A',
            photoUrl: req.body.photoUrl || ''
        });

        await nouvelleSaisie.save();
        res.redirect('/saisie/declarer?success=1'); 
    } catch (err) {
        console.error("Erreur ajout saisie:", err);
        res.redirect('/saisie/declarer?error=1');
    }
});

// 4. ACTION (PROTÉGÉE) : Supprimer le scellé de la BDD (Détruire / Restituer)
router.post('/statut/:id', isSuperviseur, async (req, res) => {
    try {
        await Saisie.findByIdAndDelete(req.params.id);
        const referer = req.get('Referrer') || '/saisie';
        res.redirect(referer);
    } catch (err) {
        console.error("Erreur lors de la suppression de la saisie:", err);
        res.redirect('/saisie');
    }
});

module.exports = router;