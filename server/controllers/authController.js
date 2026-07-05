const axios = require('axios');
const Agent = require('../models/Agent');

exports.loginPage = (req, res) => {
    res.render('pages/login', {
        layout: false,
        error: req.query.error
    });
};

exports.loginDiscord = (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;

    const rawUrl = "https://bcso-noface.up.railway.app/auth/discord/callback";
    const redirectUri = encodeURIComponent(rawUrl);

    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds.members.read`;

    res.redirect(url);
};

exports.callbackDiscord = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.redirect('/auth/login?error=NoCode');

        const rawUrl = "https://bcso-noface.up.railway.app/auth/discord/callback";

        const params = new URLSearchParams();
        params.append('client_id', process.env.DISCORD_CLIENT_ID);
        params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', rawUrl);

        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenResponse.data.access_token;

        const guildId = process.env.TEST_GUILD_ID;

        const memberResponse = await axios.get(
            `https://discord.com/api/users/@me/guilds/${guildId}/member`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const userInfo = memberResponse.data.user;
        const roles = memberResponse.data.roles || [];

        // 🔥 1. Lookup Agent DB
        let agent = await Agent.findOne({ discordId: userInfo.id });

        // 🔥 2. Déterminer rôle systeme
        let systemRole = null;

        if (
            roles.includes(process.env.ROLE_CAPTAIN_ID) ||
            roles.includes(process.env.ROLE_ADMIN_ID) ||
            agent?.isAdmin
        ) {
            systemRole = 'admin';
        } else if (roles.includes(process.env.ROLE_OFFICER_ID)) {
            systemRole = 'officer';
        }

        if (!systemRole) {
            return res.redirect('/auth/login?error=AccessDenied');
        }

        // 🔥 3. Nick RP (priorité DB > Discord)
        const username =
            agent
                ? `${agent.prenom} ${agent.nom}`
                : userInfo.global_name || userInfo.username;

        const grade = agent?.grade || 'Civil';
        const isAdmin = agent?.isAdmin || false;

        // 🔥 4. Session CLEAN
        req.session.user = {
            id: userInfo.id,
            username,
            avatar: userInfo.avatar,
            role: systemRole,
            grade,
            isAdmin
        };

        res.redirect('/dashboard');

    } catch (error) {
        console.error('Erreur Auth Discord:', error.response?.data || error.message);
        res.redirect('/auth/login?error=NotOnServer');
    }
};