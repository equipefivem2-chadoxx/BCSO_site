const router = require("express").Router();

router.get("/", (req, res) => {
    res.render("pages/home");
});

router.get("/dashboard", (req, res) => {
    res.render("pages/dashboard");
});

router.get("/tickets", (req, res) => {
    res.render("pages/tickets");
});

module.exports = router;