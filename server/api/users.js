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

router.get("/api/users/:user", limiter, async (request, response) => {
  if (!request?.params?.user) {
    response.status(400).json("Invalid Request.");
    return;
  }
  let user = request.params.user;
  if (
    !(
      (/[A-Za-z0-9_]{3,20}/.test(user) &&
        user.length >= 3 &&
        user.length <= 20) ||
      (/[0-9a-f]{24}/g.test(user) && user.length == 24)
    )
  ) {
    response.status(400).json("Invalid Request.");
    return;
  }
  let data = /[0-9a-f]{24}/.test(user)
    ? await User.findByUserIDUsingAPI(mongoDBSanitize.sanitize(user))
    : await User.findByUsernameUsingAPI(mongoDBSanitize.sanitize(user));
  data = JSON.parse(JSON.stringify(data));
  if (data == null) {
    response.status(404).json("Not Found.");
    return;
  }
  let easyLeaderboardData = await EasyModeLeaderboardsRecord.findOne({
    userIDOfHolder: data._id.toString()
  }).clone();
  let standardLeaderboardData = await StandardModeLeaderboardsRecord.findOne({
    userIDOfHolder: data._id.toString()
  }).clone();
  // add leaderboards data
  if (easyLeaderboardData != null) {
    data.statistics.personalBestScoreOnEasySingleplayerMode.globalRank =
      easyLeaderboardData.rankNumber;
  }
  if (standardLeaderboardData != null) {
    data.statistics.personalBestScoreOnStandardSingleplayerMode.globalRank =
      standardLeaderboardData.rankNumber;
  }
  response.status(200).json(data);
});

module.exports = router;
