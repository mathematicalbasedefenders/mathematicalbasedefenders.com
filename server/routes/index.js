var router = require("express").Router();

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/", limiter, (request, response) => {
  response.render("pages/index");
});

module.exports = router;
