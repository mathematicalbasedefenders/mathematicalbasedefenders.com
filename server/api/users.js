var router = require("express").Router();
const rateLimit = require("express-rate-limit");
const mongoDBSanitize = require("express-mongo-sanitize");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const User = require("../models/User.js");

router.get("/api/users/:username", limiter, async (request, response) => {
    if (!/[A-Za-z0-9_]{3,32}/.test(username)) { response.status(400).json("Invalid Request.") }
    let data = await User.safeFindByUsername(mongoDBSanitize(request.params.username));
    response.status(200).json(data);
});

module.exports = router;