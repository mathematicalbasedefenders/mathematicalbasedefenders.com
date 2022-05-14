var router = require("express").Router();

router.get("/open-source-acknowledgements", async (request, response) => {
    response.render("pages/open-source-acknowledgements");
});

module.exports = router;