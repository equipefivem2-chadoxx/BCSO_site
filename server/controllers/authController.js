const axios = require('axios');
const Agent = require('../models/Agent'); // 🚀 NOUVEAU : Import du modèle Agent

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

        // 1. Échanger le code contre un Token d'accès
        const params = new URLSearchParams();
        params.append('client_id', process.env.DISCORD_CLIENT_ID);
        params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', rawUrl);

        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // 2. Vérifier si l'utilisateur est sur le serveur de Test et récupérer ses rôles
        const testGuildId = process.env.TEST_GUILD_ID;
        const memberResponse = await axios.get(`https://discord.com/api/users/@me/guilds/${testGuildId}/member`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userRoles = memberResponse.data.roles;
        const userInfo = memberResponse.data.user;

        // 3. Attribution des accès selon le rôle Discord
        let systemRole = null;
        
        if (userRoles.includes(process.env.ROLE_CAPTAIN_ID) || userRoles.includes(process.env.ROLE_ADMIN_ID)) {
            systemRole = 'admin';
        } else if (userRoles.includes(process.env.ROLE_OFFICER_ID)) {
            systemRole = 'officer';
        }

        if (!systemRole) {
            return res.redirect('/auth/login?error=AccessDenied');
        }

        // 🚀 4. RECHERCHE EN BASE DE DONNÉES DE L'AGENT VIA SON ID DISCORD
        const agentDB = await Agent.findOne({ discordId: userInfo.id });

        const serverNickname = memberResponse.data.nick || userInfo.global_name || userInfo.username;

        // 🚀 5. SAUVEGARDE COMPLÈTE EN SESSION (Avec le vrai grade DB !)
        req.session.user = {
            id: userInfo.id,
            username: serverNickname,
            avatar: userInfo.avatar,
            role: systemRole,
            // Si on trouve l'agent en BDD, on stocke ses infos, sinon valeurs par défaut
            grade: agentDB ? agentDB.grade : 'Non assigné',
            matricule: agentDB ? agentDB.matricule : null,
            isAdmin: (systemRole === 'admin' || userInfo.id === '1247264549489610897' || (agentDB && agentDB.isAdmin === true))
        };

        res.redirect('/dashboard');

    } catch (error) {
        console.error('Erreur Auth Discord:', error.response ? error.response.data : error.message);
        res.redirect('/auth/login?error=NotOnServer');
    }
};