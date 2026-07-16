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

/**
 * 🚀 NOUVEAU : Middleware pour bloquer strictement les Deputy Junior
 * Empêche un Junior d'accéder aux pages d'évaluation (sauf s'il est admin)
 */
exports.requireDeputyMinimum = async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login?error=Unauthorized');
    }

    try {
        // Double sécurité : On vérifie en session ET en temps réel dans la base de données
        const Agent = require('../models/Agent');
        const agentDB = await Agent.findOne({ discordId: req.session.user.id });

        // Si c'est un admin (via Discord, ID dur ou BDD), il a tous les droits
        if (req.session.user.isAdmin === true || (agentDB && agentDB.isAdmin === true)) {
            return next();
        }

        // Si on ne trouve pas son matricule en BDD
        if (!agentDB) {
            return res.status(403).send("Accès Refusé : Votre compte Discord n'est lié à aucun matricule dans les effectifs BCSO.");
        }

        // Si son grade est Deputy Junior, on bloque !
        if (agentDB.grade === 'Deputy Junior') {
            return res.status(403).send("Accès Refusé : Vous n'êtes pas habilité à évaluer un agent. Requis : Deputy I minimum.");
        }

        // Si tout est bon (il est Deputy I, Sergeant, etc.), on passe !
        next();
    } catch (err) {
        console.error("Erreur middleware requireDeputyMinimum :", err);
        res.status(500).send("Erreur serveur lors de la vérification de vos habilitations.");
    }
};