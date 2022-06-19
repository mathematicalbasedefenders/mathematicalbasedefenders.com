var router = require("express").Router();
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const User = require("../models/User.js");

router.get("/api/users/:username", limiter, async (request, response) => {
    let data = await User.safeFindByUsername(request.params.username);
    response.json(data);
});

module.exports = router;