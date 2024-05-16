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
const fetch = require("node-fetch");
import _ from "lodash";
import { addLogMessageMetadata, LogMessageLevel } from "../core/log";
import { User, UserInterface } from "../models/User";
import { EasyModeLeaderboardsAPIResponse } from "../typings/EasyModeLeaderboardsAPIResponse";
import { StandardModeLeaderboardsAPIResponse } from "../typings/StandardModeLeaderboardsAPIResponse";

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
  // get data
  const data: UserInterface = _.cloneDeep(await getUserData(sanitized));
  if (!data) {
    response.status(404).json("Not Found.");
    return;
  }

  // set placeholder values
  data.statistics.personalBestScoreOnEasySingleplayerMode.globalRank = -1;
  data.statistics.personalBestScoreOnStandardSingleplayerMode.globalRank = -1;

  // get easy leaderboard data
  const easyLeaderboardResponse = await fetch(`${host}/api/leaderboards/easy`);
  const easyLeaderboardData: Array<EasyModeLeaderboardsAPIResponse> =
    await easyLeaderboardResponse.json();
  const easyLeaderboardDataRank = easyLeaderboardData.findIndex(
    (record: EasyModeLeaderboardsAPIResponse) =>
      data._id.toString() === record.playerID.toString()
  );

  // get standard leaderboards data
  const standardLeaderboardResponse = await fetch(
    `${host}/api/leaderboards/standard`
  );
  const standardLeaderboardData: Array<StandardModeLeaderboardsAPIResponse> =
    await standardLeaderboardResponse.json();
  const standardLeaderboardDataRank = standardLeaderboardData.findIndex(
    (record: StandardModeLeaderboardsAPIResponse) =>
      data._id.toString() === record.playerID.toString()
  );
  // add leaderboards data
  if (easyLeaderboardDataRank !== -1) {
    data.statistics.personalBestScoreOnEasySingleplayerMode.globalRank =
      easyLeaderboardDataRank + 1;
  }
  if (standardLeaderboardDataRank !== -1) {
    data.statistics.personalBestScoreOnStandardSingleplayerMode.globalRank =
      standardLeaderboardDataRank + 1;
  }
  response.status(200).json(data);
});

export { router };
