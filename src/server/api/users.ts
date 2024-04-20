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
import { log } from "../core/log";
import { User, UserInterface } from "../models/User";
import { EasyModeLeaderboardsAPIResponse } from "../typings/EasyModeLeaderboardsAPIResponse";
import { StandardModeLeaderboardsAPIResponse } from "../typings/StandardModeLeaderboardsAPIResponse";

const usernameRegex = /[A-Za-z0-9_]{3,20}/;
const userIDRegex = /[0-9a-f]{24}/g;

function validateUserQuery(query: string) {
  return (
    (usernameRegex.test(query) && query.length >= 3 && query.length <= 20) ||
    (userIDRegex.test(query) && query.length == 24)
  );
}

async function getUserData(query: string) {
  return userIDRegex.test(query)
    ? await User.findByUserIDUsingAPI(query)
    : await User.findByUsernameUsingAPI(query);
}

router.get("/api/users/:user", limiter, async (request, response) => {
  if (!request?.params?.user) {
    log.info(`Invalid User Request: Missing user parameter.`);
    response.status(400).json("Invalid Request.");
    return;
  }
  const user: any = request.params.user;
  const sanitized: string = mongoDBSanitize.sanitize(user) as string;
  const host = `${request.protocol}://${request.get("Host")}`;
  if (!validateUserQuery(sanitized)) {
    log.info(`Invalid User Request: Invalid user username/ID.`);
    response.status(400).json("Invalid Request.");
    return;
  }
  // get data
  const data: UserInterface = _.cloneDeep(await getUserData(sanitized));
  if (!data) {
    response.status(404).json("Not Found.");
    return;
  }

  // get easy leaderboard data
  const easyLeaderboardData: Array<EasyModeLeaderboardsAPIResponse> =
    Array.from(await fetch(`${host}/api/leaderboards/easy`));
  const easyLeaderboardDataRank = easyLeaderboardData.findIndex(
    (record: EasyModeLeaderboardsAPIResponse) =>
      data._id === record.playerID.toString()
  );

  // get standard leaderboards data
  const standardLeaderboardData: Array<StandardModeLeaderboardsAPIResponse> =
    Array.from(await fetch(`${host}/api/leaderboards/standard`));
  const standardLeaderboardDataRank = standardLeaderboardData.findIndex(
    (record: StandardModeLeaderboardsAPIResponse) =>
      data._id === record.playerID.toString()
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
  // send data
  response.status(200).json(data);
});

export { router };
