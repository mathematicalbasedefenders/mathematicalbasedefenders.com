var router = require("express").Router();

const _ = require("lodash");
const mongoose = require("mongoose");
const mongoDBSanitize = require("express-mongo-sanitize");
const url = require("url");

const { JSDOM } = require("jsdom");
const defaultWindow = new JSDOM("").window;
const createDOMPurify = require("dompurify");
const DOMPurify = createDOMPurify(defaultWindow);

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const log = require("../core/log.js")
const utilities = require("../core/utilities.js");

var User = require("../models/User.js");
var EasyModeLeaderboardsRecord = require("../models/EasyModeLeaderboardsRecord.js");
var StandardModeLeaderboardsRecord = require("../models/StandardModeLeaderboardsRecord.js");

router.get("/leaderboards", limiter, async (request, response) => {



    let leaderboardsSchema;
    let query = mongoDBSanitize.sanitize(url.parse(request.url, true)).query;
    let mode = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.mode));

    if (!mode) {
        response.redirect("/leaderboards?mode=standard");
        return;
    }

    let startCasedMode = _.startCase(mode)

    switch (mode) {
        case "easy": {
            // $("#title").text("Leaderboards (Easy Mode)");

            leaderboardsSchema = EasyModeLeaderboardsRecord;
            break;
        }
        case "standard": {
            // $("#title").text("Leaderboards (Standard Mode)");
            leaderboardsSchema = StandardModeLeaderboardsRecord;
            break;
        }
        default: {
            response.render("pages/not-found");
            return;
        }
    }

    let allPlayersOnLeaderboardsLoaded = false;
    let leaderboardData = await leaderboardsSchema.find({
        rankNumber: { $lt: 51 }
    });
    let playerData = {};

    for (let i = 1; i <= 50; i++) {
        let objectID;
        for (let object of leaderboardData) {
            if (object.rankNumber == i) {
                objectID = object.userIDOfHolder.toString();
                break;
            }
        }

        if (objectID != "???") {
            let playerRecord = await User
                .findById(objectID, function (error2, result2) {
                    return result2;
                });
                playerData[i] = [];
            playerData[i][0] = playerRecord.username;
            playerData[i][1] = utilities.calculateRank(playerRecord);
            playerData[i][2] = utilities.getRankColor(playerData[i][1]);
        }
    }

    response.render("pages/leaderboards", {
        leaderboardData: leaderboardData,
        playerData: playerData,
        gameMode: startCasedMode,
    });

});


module.exports = router;