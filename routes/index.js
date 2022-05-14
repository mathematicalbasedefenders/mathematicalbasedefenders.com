var router = require("express").Router();

router.get("/", (request, response) => {
    response.render("pages/index");
});

module.exports = router;