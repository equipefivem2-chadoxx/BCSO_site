const express = require('express');
const router = express.Router();

// Route d'accueil
router.get('/', (req, res) => {
    res.render('home', { title: 'BCSO Archives' });
});

module.exports = router;