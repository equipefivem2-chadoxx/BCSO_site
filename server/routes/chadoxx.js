const express = require('express');
const router = express.Router();

// Middleware de protection absolue (Toi seul)
const checkChadoxx = (req, res, next) => {
    if (!req.session.user || req.session.user.id !== '1247264549489610897') {
        return res.status(403).send("<h1>Accès Interdit : Tentative de violation enregistrée.</h1>");
    }
    next();
};

// Route d'affichage du Dashboard
router.get('/', checkChadoxx, (req, res) => {
    res.render('pages/chadoxx', { 
        title: 'BCSO - Interface ChadoxX',
        user: req.session.user,
        maintenanceActive: global.MAINTENANCE_MODE 
    });
});

// Route pour activer/désactiver la maintenance
router.post('/toggle-maintenance', checkChadoxx, (req, res) => {
    global.MAINTENANCE_MODE = !global.MAINTENANCE_MODE;
    
    // 🚀 MAGIE DU TEMPS RÉEL : On prévient tous les clients connectés !
    const io = req.app.get('io');
    if (io) {
        io.emit('maintenance-toggled', global.MAINTENANCE_MODE);
    }
    
    res.redirect('/chadoxx');
});

module.exports = router;