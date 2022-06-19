var router = require("express").Router();
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const User = require("../models/User.js");

router.get("/api/metadata", limiter, async (request, response) => {
    let data = Object.create(null);
    data.usersRegistered = await User.countDocuments({}, function (error, count) {
        if (error) {
            console.error(log.addMetadata(error.stack, "error"));
        }
    });
    response.json(data);
});

module.exports = router;