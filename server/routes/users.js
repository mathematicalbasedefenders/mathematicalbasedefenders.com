var router = require("express").Router();

const _ = require("lodash");
const mongoDBSanitize = require("express-mongo-sanitize");
const url = require("url");

const { JSDOM } = require("jsdom");
const defaultWindow = new JSDOM("").window;
const createDOMPurify = require("dompurify");
const DOMPurify = createDOMPurify(defaultWindow);
const axios = require("axios");
const log = require("../core/log.js");
const utilities = require("../core/utilities.js");
const configuration = require("../core/configuration.js");
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

var User = require("../models/User.js");
var EasyModeLeaderboardsRecord = require("../models/EasyModeLeaderboardsRecord.js");
var StandardModeLeaderboardsRecord = require("../models/StandardModeLeaderboardsRecord.js");

router.get("/users", limiter, async (request, response) => {
    let originalData = await validateQuery(request);
    originalData = originalData.data;
    if (originalData) {
        response.render("pages/users", {
            data: await getUserData(originalData)
        });
    } else {
        response.render("pages/not-found");
    }
});

async function validateQuery(request) {
    let query = mongoDBSanitize.sanitize(url.parse(request.url, true)).query;
    let username = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.username));
    let number = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.number));
    let invalid = false;

    if (!/^[0-9a-zA-Z_]+$/.test(username)) {
        invalid = true;
    }
    if (isNaN(number)) {
        invalid = true;
    }
    if (!username && !number) {
        invalid = true;
    }

    if (username) {
        if (!invalid) {
            data = 
                await axios.get(`${request.protocol == "http" && configuration.configuration.autoHTTPSOnAPICalls ? "https" : request.protocol}://${request.get("Host")}/api/users/${username}`
            );

        }
    } 

    return data;
}

async function getUserData(data, invalid=false) {
    // why?

    if (data && !invalid) {
        data = _.cloneDeep(data);
        let easyModeLeaderboardRank = await EasyModeLeaderboardsRecord.findOne({
            userIDOfHolder: data["_id"]
        });
        let standardModeLeaderboardRank =
            await StandardModeLeaderboardsRecord.findOne({
                userIDOfHolder: data["_id"]
            });

        if (easyModeLeaderboardRank) {
            easyModeLeaderboardRank = JSON.parse(
                JSON.stringify(easyModeLeaderboardRank)
            ).rankNumber;
        }
        if (standardModeLeaderboardRank) {
            standardModeLeaderboardRank = JSON.parse(
                JSON.stringify(standardModeLeaderboardRank)
            ).rankNumber;
        }

        data.rank = utilities.calculateRank(data);
        data.rankColor = utilities.getRankColor(utilities.calculateRank(data));
        data.emailAddress = "";
        data.hashedPassword = "";
        data.statistics.easyModeLeaderboardRank = easyModeLeaderboardRank;
        data.statistics.standardModeLeaderboardRank =
            standardModeLeaderboardRank;
        data.statistics.currentLevel = `${utilities.getLevel(
            data.statistics.totalExperiencePoints
        )}`;
        data.statistics.progressToNextLevelInPercentage = `${parseFloat(
            (
                utilities.getProgressToNextLevel(data.statistics.totalExperiencePoints) *
                100
            ).toFixed(3)
        ).toString()}%`;
    }

    return data;
}

module.exports = router;
