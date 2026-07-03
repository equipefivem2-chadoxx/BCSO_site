const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// URL: /auth/login
router.get('/login', authController.loginPage);

// URL: /auth/discord
router.get('/discord', authController.loginDiscord);

// URL: /auth/discord/callback (Lien de retour configuré sur le portail Discord)
router.get('/discord/callback', authController.callbackDiscord);

module.exports = router;