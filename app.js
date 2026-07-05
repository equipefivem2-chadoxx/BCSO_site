require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const connectDB = require('./database/config');

const app = express();
const PORT = process.env.PORT || 3000;

// 🚀 DB
connectDB();

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layouts/main');

// static + body
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session
app.use(session({
    secret: process.env.SESSION_SECRET || 'bcso_secret_key_secure',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// 🔥 GLOBAL USER
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// 🔥 LIVE SYNC DB -> SESSION (IMPORTANT FIX ADMIN REAL TIME)
app.use(async (req, res, next) => {
    if (req.session.user?.id) {
        try {
            const Agent = require('./server/models/Agent');

            const agent = await Agent.findOne({ discordId: req.session.user.id });

            if (agent) {
                req.session.user.isAdmin = agent.isAdmin;
                req.session.user.grade = agent.grade;
                req.session.user.prenom = agent.prenom;
                req.session.user.nom = agent.nom;
                req.session.user.matricule = agent.matricule;
            }
        } catch (err) {
            console.error("SYNC ERROR:", err);
        }
    }
    next();
});

// routes
const indexRouter = require('./server/routes/index');
app.use('/', indexRouter);

app.listen(PORT, () => {
    console.log(`[BCSO MDT] 🟢 Système en ligne sur le port ${PORT}`);
});