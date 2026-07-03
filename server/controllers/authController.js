const axios = require('axios');

exports.loginPage = (req, res) => {
    // Affiche la page de connexion EJS SANS le layout global
    // On passe "error" pour que la vue EJS puisse afficher les messages de refus
    res.render('pages/login', { 
        layout: false, 
        error: req.query.error 
    });
};

exports.loginDiscord = (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_CALLBACK_URL);
    // Scopes importants : identify (profil basique) + guilds.members.read (pour lire ses rôles)
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds.members.read`;
    res.redirect(url);
};

exports.callbackDiscord = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.redirect('/auth/login?error=NoCode');

        // 1. Échanger le code contre un Token d'accès
        const params = new URLSearchParams();
        params.append('client_id', process.env.DISCORD_CLIENT_ID);
        params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', process.env.DISCORD_CALLBACK_URL);

        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // 2. Vérifier si l'utilisateur est sur le serveur de Test et récupérer ses rôles
        const testGuildId = process.env.TEST_GUILD_ID;
        const memberResponse = await axios.get(`https://discord.com/api/users/@me/guilds/${testGuildId}/member`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userRoles = memberResponse.data.roles; // Tableau contenant les IDs des rôles
        const userInfo = memberResponse.data.user;

        // 3. Attribution des accès selon le rôle Discord
        let systemRole = null;
        if (userRoles.includes(process.env.ROLE_ADMIN_ID)) {
            systemRole = 'admin';
        } else if (userRoles.includes(process.env.ROLE_OFFICER_ID)) {
            systemRole = 'officer';
        }

        // Si aucun rôle correspondant, on bloque l'accès
        if (!systemRole) {
            return res.redirect('/auth/login?error=AccessDenied');
        }

        // 4. Sauvegarde dans la session
        req.session.user = {
            id: userInfo.id,
            username: userInfo.username,
            avatar: userInfo.avatar,
            role: systemRole
        };

        // Redirection vers le dashboard après connexion réussie
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Erreur Auth Discord:', error.response ? error.response.data : error.message);
        res.redirect('/auth/login?error=NotOnServer');
    }
};