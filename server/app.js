require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Configuration du moteur de vue EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware pour les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// Importation des routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});