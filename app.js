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

// =====================
// VIEW ENGINE
// =====================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layouts/main');

// =====================
// MIDDLEWARES
// =====================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// SESSION
// =====================
app.use(session({
    secret: process.env.SESSION_SECRET || 'bcso_secret_key_secure',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// =====================
// GLOBAL USER EJS
// =====================
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// =====================
// ROUTES IMPORT (IMPORTANT FIX)
// =====================
const indexRouter = require('./server/routes/index');
const authRouter = require('./server/routes/auth');
const adminRouter = require('./server/routes/admin');

// =====================
// ROUTES USE
// =====================
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/admin', adminRouter);

// =====================
// DASHBOARD ROUTE DIRECT (si pas de fichier)
// =====================
const { requireAuth, syncUser } = require('./server/middleware/checkAuth');

app.get('/dashboard', requireAuth, syncUser, (req, res) => {
    res.render('pages/dashboard', {
        user: req.session.user
    });
});

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
    console.log(`[BCSO MDT] 🟢 Système en ligne sur le port ${PORT}`);
});