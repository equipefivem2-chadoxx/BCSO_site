const express = require('express');
const router = express.Router();
const axios = require('axios');

const authRoutes = require('./auth');
const adminRoutes = require('./admin'); 
const effectifsRoutes = require('./effectifs');
const archivesRoutes = require('./archives');
const apiTicketsRoutes = require('./api/tickets');

router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

router.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    let agentsCount = 0;
    let ticketsArchivesCount = 0;
    let ticketsEnCoursCount = 0;
    let recentTickets = []; // 🚀 Variable pour le flux en direct

    try {
        const Agent = require('../models/Agent');
        agentsCount = await Agent.countDocuments();
        
        const Ticket = require('../models/Ticket');
        ticketsArchivesCount = await Ticket.countDocuments();
        
        // 🚀 Récupération des 5 dernières archives pour le Flux
        recentTickets = await Ticket.find({}).sort({ dateCreation: -1 }).limit(5);
    } catch (err) {
        console.log('Attente de la création des collections...');
    }

    // Calcul des tickets en cours via Discord
    const { DISCORD_TOKEN, GUILD_ID } = process.env;
    // 👇 ICI : Le bon ID de ta catégorie Discord
    const TICKET_CATEGORY_ID = "1427847738665472030"; 
    
    if (DISCORD_TOKEN && GUILD_ID) {
        try {
            const response = await axios.get(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
                headers: { Authorization: `Bot ${DISCORD_TOKEN}` }
            });
            const channels = response.data;
            const openTickets = channels.filter(c => c.parent_id === TICKET_CATEGORY_ID);
            ticketsEnCoursCount = openTickets.length;
        } catch (discordErr) {
            console.error("Impossible de récupérer les salons Discord:", discordErr.message);
        }
    } else {
        console.warn("⚠️ Attention: DISCORD_TOKEN ou GUILD_ID manquants dans le fichier .env du site.");
    }

    res.render('pages/dashboard', { 
        title: 'BCSO - Dashboard Principal',
        user: req.session.user,
        agentsCount: agentsCount,
        ticketsArchivesCount: ticketsArchivesCount,
        ticketsEnCoursCount: ticketsEnCoursCount,
        recentTickets: recentTickets // 🚀 Envoi vers le dashboard.ejs
    });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/effectifs', effectifsRoutes);
router.use('/archives', archivesRoutes);
router.use('/api/tickets', apiTicketsRoutes);

router.use((req, res) => {
    res.status(404).render('pages/404', { message: 'Page introuvable', title: '404' });
});

module.exports = router;