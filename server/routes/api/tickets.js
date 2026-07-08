const express = require('express');
const router = express.Router();
const Ticket = require('../../models/Ticket');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // Utilisé pour générer des noms de fichiers uniques

// Route API sécurisée appelée par le Bot Discord
router.post('/transcript', async (req, res) => {
    try {
        const { ticketId, channelName, openedBy, closedBy, motif, messages } = req.body;
        
        // Sécurité basique : s'assurer que les données minimales sont présentes
        if (!ticketId || !channelName || !messages) {
            return res.status(400).json({ success: false, message: 'Données incomplètes.' });
        }

        // 🚀 1. Création du dossier physique pour stocker les images
        // Remonte les dossiers (api -> routes -> server -> BCSO SITE) pour cibler "public/uploads"
        const uploadDir = path.join(__dirname, '../../../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 🚀 2. On extrait les images Base64 pour ne pas faire crasher MongoDB (Limite de 16 Mo)
        for (let i = 0; i < messages.length; i++) {
            let content = messages[i].content || "";

            if (content.includes('[IMAGE]')) {
                const parts = content.split('[IMAGE]');
                let textPart = parts[0].trim();
                let urlsPart = parts[1].trim();

                let newUrls = [];
                const b64Strings = urlsPart.split(/\s+/);

                for (let b64 of b64Strings) {
                    if (b64.startsWith('data:image')) {
                        // Extraction propre du Base64
                        const matches = b64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const ext = matches[1].split('/')[1] || 'png'; // Récupère jpg ou png
                            const buffer = Buffer.from(matches[2], 'base64');
                            
                            // Nom de fichier unique : preuve_ID_lettresaleatoires.png
                            const fileName = `preuve_${ticketId}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
                            const filePath = path.join(uploadDir, fileName);

                            // Sauvegarde physique de l'image sur le serveur web
                            fs.writeFileSync(filePath, buffer);

                            // URL publique de l'image (pour que ton EJS l'affiche)
                            newUrls.push(`https://bcso-noface.up.railway.app/uploads/${fileName}`);
                        }
                    } else if (b64.startsWith('http')) {
                        newUrls.push(b64); // On garde les liens normaux au cas où
                    }
                }

                // On réécrit le message SANS le Base64, juste avec le lien vers l'image
                if (newUrls.length > 0) {
                    messages[i].content = textPart ? `${textPart} [IMAGE] ${newUrls.join(' ')}` : `[IMAGE] ${newUrls.join(' ')}`;
                } else {
                    messages[i].content = textPart;
                }
            }
        }

        // 🚀 3. Sauvegarde MongoDB (Le ticket est maintenant ultra léger)
        const nouveauTicket = new Ticket({
            ticketId,
            channelName,
            openedBy,
            closedBy,
            motif: motif || 'Non spécifié',
            messages
        });

        await nouveauTicket.save();
        return res.status(201).json({ success: true, message: 'Transcription enregistrée avec succès.' });
        
    } catch (error) {
        console.error('Erreur API Transcription:', error);
        return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});

// 🚀 NOUVELLE ROUTE : Le bot envoie le nombre de tickets en cours ici
router.post('/sync-count', (req, res) => {
    try {
        const { count } = req.body;
        
        if (typeof count === 'number') {
            // Sauvegarde dans la mémoire globale d'Express (ultra rapide)
            req.app.locals.ticketsEnCoursCount = count;
            return res.status(200).json({ success: true, message: 'Compteur mis à jour' });
        }
        
        return res.status(400).json({ success: false, message: 'Format invalide' });
    } catch (error) {
        return res.status(500).json({ success: false });
    }
});

// 🚀 ROUTE D'ACTUALISATION EN DIRECT (Interrogée en tâche de fond par le Dashboard)
router.get('/live-data', async (req, res) => {
    try {
        const enCoursCount = req.app.locals.ticketsEnCoursCount || 0;
        const archivesCount = await Ticket.countDocuments();
        
        return res.json({
            success: true,
            ticketsEnCoursCount: enCoursCount,
            ticketsArchivesCount: archivesCount
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des données live:', error);
        return res.status(500).json({ success: false });
    }
});

module.exports = router;