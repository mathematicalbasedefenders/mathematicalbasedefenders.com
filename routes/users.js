var router = require("express").Router();

const _ = require("lodash");
const mongoDBSanitize = require("express-mongo-sanitize");
const url = require("url");

const { JSDOM } = require("jsdom");
const defaultWindow = new JSDOM("").window;
const createDOMPurify = require("dompurify");
const DOMPurify = createDOMPurify(defaultWindow);

const log = require("../server/core/log.js");
const utilities = require("../server/core/utilities.js");

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
    let originalData = await validateQuery(request.url);
    if (originalData) {
        response.render("pages/users", {
            data: await getUserData(originalData)
        });
    } else {
        response.render("pages/not-found");
    }
});

async function validateQuery(requestURL) {
    let query = mongoDBSanitize.sanitize(url.parse(requestURL, true)).query;
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
            data = await User.findOne(
                { username: username },
                function (error, result) {
                    if (error) {
                        console.error(log.addMetadata(error.stack, "error"));
                    }
                    return result;
                }
            );
        }
    } else {
        if (!invalid) {
            data = await User.findOne(
                { userNumber: number },
                function (error, result) {
                    if (error) {
                        console.error(log.addMetadata(error.stack, "error"));
                    }
                    return result;
                }
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
