var router = require("express").Router();

router.get("/changelog", (request, response) => {
    response.render("pages/changelog");
});

module.exports = router;