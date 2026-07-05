const Agent = require('../models/Agent');

/**
 * Auth obligatoire
 */
exports.requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login?error=Unauthorized');
    }
    next();
};

/**
 * Admin ONLY (Discord + DB + SuperAdmin)
 */
exports.requireAdmin = async (req, res, next) => {
    const user = req.session.user;

    if (!user) {
        return res.redirect('/auth/login');
    }

    try {
        // 🔥 1. Super Admin hardcoded
        if (user.id === '1247264549489610897') {
            return next();
        }

        // 🔥 2. Admin Discord role (session)
        if (user.role === 'admin') {
            return next();
        }

        // 🔥 3. Admin DB (Agent.isAdmin)
        const agent = await Agent.findOne({ discordId: user.id });

        if (agent && agent.isAdmin === true) {
            return next();
        }

        // ❌ pas admin
        return res.redirect('/dashboard');

    } catch (err) {
        console.error('requireAdmin error:', err);
        return res.redirect('/dashboard');
    }
};

/**
 * 🔥 SYNC OPTIONNEL (IMPORTANT FIX TEMPS RÉEL)
 * Permet de mettre à jour grade / admin sans relog
 */
exports.syncUser = async (req, res, next) => {
    if (!req.session.user) return next();

    try {
        const agent = await Agent.findOne({ discordId: req.session.user.id });

        if (agent) {
            req.session.user.grade = agent.grade;
            req.session.user.isAdmin = agent.isAdmin;
            req.session.user.matricule = agent.matricule;
            req.session.user.prenom = agent.prenom;
            req.session.user.nom = agent.nom;
        }

        next();

    } catch (err) {
        console.error("syncUser error:", err);
        next();
    }
};