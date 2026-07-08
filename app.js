require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const connectDB = require('./database/config'); // 🧱 Import du module de Base de Données
const Agent = require('./server/models/Agent'); // 👮‍♂️ Import du modèle Agent pour la vérification globale

const app = express();
const PORT = process.env.PORT || 3000;

// 🚀 Initialisation de la Base de Données MongoDB
connectDB();

// 1. Configuration du moteur de rendu (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuration du Layout EJS
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 2. Middlewares natifs
app.use(express.static(path.join(__dirname, 'public')));
// 🚀 NOUVEAU : On augmente la limite à 50 Mo pour accepter les lourdes images Base64 des archives
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Configuration de la session (Modulaire)
app.use(session({
    secret: process.env.SESSION_SECRET || 'bcso_secret_key_secure',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 24 heures
}));

// 4. Injection des variables globales pour les vues EJS (Mise à jour avec vérification BDD)
app.use(async (req, res, next) => {
    // On initialise la variable locale avec l'utilisateur en session s'il existe
    res.locals.user = req.session.user || null;
    
    // Si l'utilisateur est connecté via Discord, on va chercher son statut en Base de Données
    if (req.session.user) {
        try {
            const agentBDD = await Agent.findOne({ discordId: req.session.user.id });
            if (agentBDD) {
                // On injecte dynamiquement le statut 'isAdmin' de la BDD pour que EJS (sidebar) le lise
                res.locals.user.isAdmin = agentBDD.isAdmin || false;
            } else {
                res.locals.user.isAdmin = false;
            }
        } catch (error) {
            console.error('[BCSO MDT] 🔴 Erreur lors de la vérification Admin globale:', error);
            res.locals.user.isAdmin = false;
        }
    }
    
    next();
});

// 5. Chargement du Routeur Global
const indexRouter = require('./server/routes/index');
app.use('/', indexRouter);

// 6. Lancement du serveur
app.listen(PORT, () => {
    console.log(`[BCSO MDT] 🟢 Système en ligne sur le port ${PORT}`);
});