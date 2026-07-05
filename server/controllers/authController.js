const Agent = require('../models/Agent');
const axios = require('axios');

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

        const memberResponse = await axios.get(
            `https://discord.com/api/users/@me`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const guildMember = await axios.get(
            `https://discord.com/api/users/@me/guilds/${process.env.TEST_GUILD_ID}/member`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const userInfo = guildMember.data.user;
        const roles = guildMember.data.roles || [];

        // 🔥 IMPORTANT : on récupère l’agent Mongo
        let agent = await Agent.findOne({ discordId: userInfo.id });

        // si pas d’agent => fallback
        if (!agent) {
            return res.redirect('/auth/login?error=NoAgentLinked');
        }

        // 🔥 ROLE FINAL = MONGO + DISCORD
        let systemRole = agent.isAdmin ? 'admin' : 'officer';

        // (option bonus si tu veux garder discord override)
        if (roles.includes(process.env.ROLE_CAPTAIN_ID)) {
            systemRole = 'admin';
        }

        const serverNickname =
            guildMember.data.nick ||
            userInfo.global_name ||
            userInfo.username;

        req.session.user = {
            id: userInfo.id,
            username: serverNickname,
            avatar: userInfo.avatar,
            role: systemRole,
            grade: agent.grade,
            isAdmin: agent.isAdmin
        };

        return res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        return res.redirect('/auth/login?error=AuthFail');
    }
};