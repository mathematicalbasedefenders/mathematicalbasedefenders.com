var User = require("../models/User.js");

var router = require("express").Router();

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

router.get("/statistics", limiter, (request, response) => {
    User.countDocuments({}, function (error, count) {
        if (error) {
            console.error(log.addMetadata(error.stack, "error"));
        }
        response.render("pages/statistics", {
            statistics: { registeredUsers: count }
        });
    });
});

module.exports = router;