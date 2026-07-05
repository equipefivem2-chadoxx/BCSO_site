const Agent = require('../models/Agent');

/**
 * AUTH obligatoire
 */
exports.requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login?error=Unauthorized');
    }
    next();
};

/**
 * ADMIN ONLY (Discord + DB + SuperAdmin)
 */
exports.requireAdmin = async (req, res, next) => {
    const sessionUser = req.session.user;

    if (!sessionUser) {
        return res.redirect('/auth/login');
    }

    try {
        // 🔥 1. Super Admin hardcodé
        if (sessionUser.id === '1247264549489610897') {
            return next();
        }

        // 🔥 2. Check DB (SOURCE OF TRUTH)
        const agent = await Agent.findOne({ discordId: sessionUser.id });

        if (agent?.isAdmin === true) {
            return next();
        }

        // 🔥 3. fallback discord role
        if (sessionUser.role === 'admin') {
            return next();
        }

        return res.redirect('/dashboard');

    } catch (err) {
        console.error('requireAdmin error:', err);
        return res.redirect('/dashboard');
    }
};