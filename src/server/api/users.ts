import express from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
import mongoDBSanitize from "express-mongo-sanitize";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

import _ from "lodash";
import { addLogMessageMetadata, LogMessageLevel } from "../core/log";
import { User, UserInterface } from "../models/User";
import EasyModeLeaderboardsRecord from "../models/EasyModeLeaderboardsRecord.js";
import StandardModeLeaderboardsRecord from "../models/StandardModeLeaderboardsRecord.js";

router.get("/api/users/:user", limiter, async (request, response) => {
  if (!request?.params?.user) {
    response.status(400).json("Invalid Request.");
    return;
  }
  let user: any = request.params.user;
  let sanitized: string = mongoDBSanitize.sanitize(user) as string;
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
  let data: any = /[0-9a-f]{24}/.test(user)
    ? await User.findByUserIDUsingAPI(sanitized)
    : await User.findByUsernameUsingAPI(sanitized);
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

export { router };
