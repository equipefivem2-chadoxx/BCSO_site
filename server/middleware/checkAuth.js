/**
 * Middleware pour bloquer l'accès aux utilisateurs non connectés
 */
exports.requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login?error=Unauthorized');
    }
    next();
};

/**
 * Middleware pour bloquer l'accès selon le rôle (ex: Admin uniquement)
 */
exports.requireRole = (role) => {
    return (req, res, next) => {
        if (!req.session.user || req.session.user.role !== role) {
            return res.status(403).send('Accès refusé : Habilitation insuffisante.');
        }
        next();
    };
};