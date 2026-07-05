const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.redirect('/auth/login');
});

router.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    let agentsCount = 0;
    let ticketsArchivesCount = 0;
    let ticketsEnCoursCount = 0;
    let recentTickets = [];

    try {
        const Agent = require('../models/Agent');
        const Ticket = require('../models/Ticket');

        agentsCount = await Agent.countDocuments();
        ticketsArchivesCount = await Ticket.countDocuments();
        recentTickets = await Ticket.find().sort({ dateCreation: -1 }).limit(5);
    } catch (err) {
        console.log('DB loading...');
    }

    const { DISCORD_TOKEN, GUILD_ID } = process.env;
    const TICKET_CATEGORY_ID = "1522570076073627719";

    if (DISCORD_TOKEN && GUILD_ID) {
        try {
            const response = await axios.get(
                `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
                { headers: { Authorization: `Bot ${DISCORD_TOKEN}` } }
            );

            const channels = response.data;
            const openTickets = channels.filter(c => c.parent_id === TICKET_CATEGORY_ID);
            ticketsEnCoursCount = openTickets.length;

        } catch (err) {
            console.error("Discord error:", err.message);
        }
    }

    res.render('pages/dashboard', {
        title: 'BCSO Dashboard',
        user: req.session.user,
        agentsCount,
        ticketsArchivesCount,
        ticketsEnCoursCount,
        recentTickets
    });
});

// routes
router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));
router.use('/effectifs', require('./effectifs'));
router.use('/archives', require('./archives'));
router.use('/api/tickets', require('./api/tickets'));

module.exports = router;