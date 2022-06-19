var router = require("express").Router();
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});
router.get("/open-source-acknowledgements", limiter,async (request, response) => {
    response.render("pages/open-source-acknowledgements");
});

module.exports = router;