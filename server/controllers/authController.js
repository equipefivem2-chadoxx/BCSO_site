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

    const redirectUri = encodeURIComponent(
        "https://bcso-noface.up.railway.app/auth/discord/callback"
    );

    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds.members.read`;

    res.redirect(url);
};

exports.callbackDiscord = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.redirect('/auth/login?error=NoCode');

        const redirectUri = "https://bcso-noface.up.railway.app/auth/discord/callback";

        const params = new URLSearchParams();
        params.append('client_id', process.env.DISCORD_CLIENT_ID);
        params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        const tokenRes = await axios.post(
            'https://discord.com/api/oauth2/token',
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenRes.data.access_token;

        const guildId = process.env.TEST_GUILD_ID;

        const memberRes = await axios.get(
            `https://discord.com/api/users/@me/guilds/${guildId}/member`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const roles = memberRes.data.roles || [];
        const userInfo = memberRes.data.user;

        let systemRole = null;

        if (
            roles.includes(process.env.ROLE_ADMIN_ID) ||
            roles.includes(process.env.ROLE_CAPTAIN_ID)
        ) {
            systemRole = 'admin';
        } else if (roles.includes(process.env.ROLE_OFFICER_ID)) {
            systemRole = 'officer';
        }

        if (!systemRole) {
            return res.redirect('/auth/login?error=AccessDenied');
        }

        let agent = await Agent.findOne({ discordId: userInfo.id });

        if (!agent) {
            agent = await Agent.create({
                discordId: userInfo.id,
                prenom: userInfo.global_name || userInfo.username,
                nom: "N/A",
                matricule: "TEMP-" + userInfo.id.slice(-4),
                grade: systemRole === 'admin' ? 'Sheriff' : 'Deputy Junior',
                isAdmin: systemRole === 'admin'
            });
        } else {
            agent.isAdmin = systemRole === 'admin';
            await agent.save();
        }

        const displayName =
            memberRes.data.nick ||
            userInfo.global_name ||
            userInfo.username;

        // 🔥 SESSION CLEAN + COMPLETE
        req.session.user = {
            id: userInfo.id,
            username: displayName,
            role: systemRole,
            prenom: agent.prenom,
            nom: agent.nom,
            matricule: agent.matricule,
            grade: agent.grade,
            isAdmin: agent.isAdmin
        };

        return res.redirect('/dashboard');

    } catch (err) {
        console.error(err?.response?.data || err.message);
        return res.redirect('/auth/login?error=AuthFailed');
    }
};