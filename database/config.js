const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // La variable MONGO_URI sera à définir sur Railway
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`[BCSO DATABASE] 🟢 Connecté à MongoDB : ${conn.connection.host}`);
    } catch (error) {
        console.error(`[BCSO DATABASE] 🔴 Erreur de connexion : ${error.message}`);
        // Ne fait pas crasher l'app entière si la BDD met du temps à répondre
    }
};

module.exports = connectDB;