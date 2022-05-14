var User = require("../models/User.js");

var router = require("express").Router();


router.get("/statistics", (request, response) => {
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