var router = require("express").Router();

router.get("/about", (request, response) => {
    response.render("pages/about");
});

module.exports = router;