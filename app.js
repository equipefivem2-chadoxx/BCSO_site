require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const connectDB = require('./database/config'); // 🧱 Import du module de Base de Données

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Configuration de la session (Modulaire)
app.use(session({
    secret: process.env.SESSION_SECRET || 'bcso_secret_key_secure',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 24 heures
}));

// 4. Injection des variables globales pour les vues EJS
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// 5. Chargement du Routeur Global
const indexRouter = require('./server/routes/index');
app.use('/', indexRouter);

// 6. Lancement du serveur
app.listen(PORT, () => {
    console.log(`[BCSO MDT] 🟢 Système en ligne sur le port ${PORT}`);
});