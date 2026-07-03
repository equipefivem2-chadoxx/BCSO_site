exports.getHomePage = (req, res) => {
    // Plus tard, nous pourrons injecter ici les statistiques du bot Discord
    res.render('pages/home', { 
        title: 'Accueil | BCSO Archives' 
    });
};