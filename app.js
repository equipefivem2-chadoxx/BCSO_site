require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const connectDB = require('./database/config'); 
const Agent = require('./server/models/Agent'); 

const app = express();
const PORT = process.env.PORT || 3000;

// 🔌 NOUVEAU : Configuration Socket.io pour le temps réel
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server);

// On rend "io" accessible partout dans les routes (très pratique !)
app.set('io', io);

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Configuration de la session (Modulaire)
app.use(session({
    secret: process.env.SESSION_SECRET || 'bcso_secret_key_secure',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 24 heures
}));

// 4. Injection des variables globales pour les vues EJS 
app.use(async (req, res, next) => {
    res.locals.user = req.session.user || null;
    
    if (req.session.user) {
        try {
            const agentBDD = await Agent.findOne({ discordId: req.session.user.id });
            if (agentBDD) {
                res.locals.user.isAdmin = agentBDD.isAdmin || false;
                // 🚀 CORRECTION DU BUG SLO : On met à jour le grade en direct depuis la BDD !
                res.locals.user.grade = agentBDD.grade; 
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

// =========================================================
// 🔒 SYSTÈME DE MAINTENANCE GLOBAL (CHADOXX GOD MODE)
// =========================================================
global.MAINTENANCE_MODE = false; // Par défaut, le site est allumé

app.use((req, res, next) => {
    // 1. Si la maintenance est désactivée, on laisse passer tout le monde
    if (!global.MAINTENANCE_MODE) return next();

    // 2. On laisse toujours charger les images, le CSS et le JS (pour le design)
    if (req.path.startsWith('/images') || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/assets')) {
        return next();
    }

    // 3. LA PORTE DÉROBÉE (Ton ID Discord)
    if (req.session && req.session.user && req.session.user.id === '1247264549489610897') {
        return next();
    }

    // 4. Pour tous les autres : On affiche la page de maintenance sans la sidebar
    res.status(503).render('pages/maintenance', { layout: false });
});
// =========================================================

// 5. Chargement du Routeur Global
const indexRouter = require('./server/routes/index');
app.use('/', indexRouter);

// 6. Lancement du serveur
server.listen(PORT, () => {
    console.log(`[BCSO MDT] 🟢 Système en ligne sur le port ${PORT}`);
});