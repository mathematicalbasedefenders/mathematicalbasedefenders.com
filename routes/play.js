var router = require("express").Router();

router.get("/play", (request, response) => {
    response.render("pages/play");
});

module.exports = router;