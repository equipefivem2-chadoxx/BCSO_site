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
    
    // ⚠️ L'URL en dur pour contourner les bugs de formatage des variables sur Railway
    const rawUrl = "https://bcso-noface.up.railway.app/auth/discord/callback";
    const redirectUri = encodeURIComponent(rawUrl);
    
    // Scopes importants : identify (profil basique) + guilds.members.read (pour lire ses rôles)
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds.members.read`;
    res.redirect(url);
};

exports.callbackDiscord = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.redirect('/auth/login?error=NoCode');

        // ⚠️ Il faut utiliser EXACTEMENT la même URL en dur ici pour la validation du token
        const rawUrl = "https://bcso-noface.up.railway.app/auth/discord/callback";

        // 1. Échanger le code contre un Token d'accès
        const params = new URLSearchParams();
        params.append('client_id', process.env.DISCORD_CLIENT_ID);
        params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', rawUrl); // On passe l'URL propre ici

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
        
        // Le rôle Capitaine est reconnu comme le vrai lead et obtient les droits d'administration
        if (userRoles.includes(process.env.ROLE_CAPTAIN_ID) || userRoles.includes(process.env.ROLE_ADMIN_ID)) {
            systemRole = 'admin';
        } else if (userRoles.includes(process.env.ROLE_OFFICER_ID)) {
            systemRole = 'officer';
        }

        // Si aucun rôle correspondant, on bloque l'accès
        if (!systemRole) {
            return res.redirect('/auth/login?error=AccessDenied');
        }

        // 🚀 4. Sauvegarde dans la session (Avec gestion du pseudo serveur)
        // S'il n'y a pas de rename sur le serveur (nick), on se rabat sur le pseudo global, puis classique.
        const serverNickname = memberResponse.data.nick || userInfo.global_name || userInfo.username;

        req.session.user = {
            id: userInfo.id,
            username: serverNickname,
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