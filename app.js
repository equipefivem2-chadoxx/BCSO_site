require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// Configuration EJS et Layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main'); // Pointe vers views/layouts/main.ejs

// Fichiers statiques (CSS, Images, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Importation des routes (Architecture modulaire)
const indexRoutes = require('./server/routes/index');
app.use('/', indexRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur BCSO opérationnel sur le port ${PORT}`);
});