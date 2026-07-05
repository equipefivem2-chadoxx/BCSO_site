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

        // 1. Token Discord
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

        // 2. Infos membre guild
        const guildId = process.env.TEST_GUILD_ID;

        const memberResponse = await axios.get(
            `https://discord.com/api/users/@me/guilds/${guildId}/member`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const userRoles = memberResponse.data.roles || [];
        const userInfo = memberResponse.data.user;

        // 3. Role system
        let systemRole = null;

        if (
            userRoles.includes(process.env.ROLE_CAPTAIN_ID) ||
            userRoles.includes(process.env.ROLE_ADMIN_ID)
        ) {
            systemRole = 'admin';
        } else if (userRoles.includes(process.env.ROLE_OFFICER_ID)) {
            systemRole = 'officer';
        }

        if (!systemRole) {
            return res.redirect('/auth/login?error=AccessDenied');
        }

        // 4. 🔥 SYNC AVEC MONGO (IMPORTANT FIX)
        let agent = await Agent.findOne({ discordId: userInfo.id });

        if (!agent) {
            agent = await Agent.create({
                discordId: userInfo.id,
                prenom: userInfo.global_name || userInfo.username,
                nom: "",
                matricule: "TEMP-" + userInfo.id.slice(-4),
                grade: systemRole === 'admin' ? 'Sheriff' : 'Deputy Junior',
                isAdmin: systemRole === 'admin'
            });
        }

        // 5. refresh admin DB (IMPORTANT)
        if (systemRole === 'admin') {
            agent.isAdmin = true;
            await agent.save();
        }

        // 6. nickname Discord
        const serverNickname =
            memberResponse.data.nick ||
            userInfo.global_name ||
            userInfo.username;

        // 7. SESSION CLEAN
        req.session.user = {
            id: userInfo.id,
            username: serverNickname,
            role: systemRole,
            matricule: agent.matricule,
            grade: agent.grade
        };

        return res.redirect('/dashboard');

    } catch (err) {
        console.error('Auth error:', err?.response?.data || err.message);
        return res.redirect('/auth/login?error=AuthFailed');
    }
};