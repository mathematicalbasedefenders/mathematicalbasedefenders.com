var router = require("express").Router();
const rateLimit = require("express-rate-limit");
const mongoDBSanitize = require("express-mongo-sanitize");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const _ = require("lodash");

const User = require("../models/User.js");
const EasyModeLeaderboardsRecord = require("../models/EasyModeLeaderboardsRecord.js");
const StandardModeLeaderboardsRecord = require("../models/StandardModeLeaderboardsRecord.js");

router.get("/api/users/:username", limiter, async (request, response) => {
    if (!request?.params?.username) { response.status(400).json("Invalid Request."); return; }
    let username = request.params.username;
    if (!/[A-Za-z0-9_]{3,32}/.test(username)) { response.status(400).json("Invalid Request."); return; }
    let data = await User.safeFindByUsername(mongoDBSanitize.sanitize(username));
    data = JSON.parse(JSON.stringify(data));
    if (data == null) {response.status(400).json("Invalid Request."); return;}
    let easyLeaderboardData = await EasyModeLeaderboardsRecord.findOne({userIDOfHolder: data._id.toString()});
    let standardLeaderboardData = await StandardModeLeaderboardsRecord.findOne({userIDOfHolder: data._id.toString()});
    // add leaderboards data
    if (easyLeaderboardData != null){
        data.statistics.personalBestScoreOnEasySingleplayerMode.globalRank = easyLeaderboardData.rankNumber; 
    }
    if (standardLeaderboardData != null){
        data.statistics.personalBestScoreOnStandardSingleplayerMode.globalRank = standardLeaderboardData.rankNumber; 
    }
    response.status(200).json(data);
});

module.exports = router;