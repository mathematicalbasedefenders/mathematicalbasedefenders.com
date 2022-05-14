var router = require("express").Router();

router.get("/attributions", (request, response) => {
    response.render("pages/attributions");
});

module.exports = router;