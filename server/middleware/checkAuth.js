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
        // 1. Super admin hardcoded
        if (user.id === '1247264549489610897') {
            return next();
        }

        // 2. Role Discord admin
        if (user.role === 'admin') {
            return next();
        }

        // 3. Admin DB (Agent.isAdmin)
        const agent = await Agent.findOne({ discordId: user.id });

        if (agent && agent.isAdmin === true) {
            return next();
        }

        return res.redirect('/dashboard');

    } catch (err) {
        console.error('requireAdmin error:', err);
        return res.redirect('/dashboard');
    }
};