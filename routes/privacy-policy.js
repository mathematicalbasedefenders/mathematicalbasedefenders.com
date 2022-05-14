var router = require("express").Router();

router.get("/privacy-policy", (request, response) => {
    response.render("pages/privacy-policy");
});

module.exports = router;