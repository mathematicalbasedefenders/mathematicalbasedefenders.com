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
type LeaderboardsAPIResponse =
  | EasyModeLeaderboardsAPIResponse
  | StandardModeLeaderboardsAPIResponse;
const usernameRegex = /^[A-Za-z0-9_\-]{3,20}$/;
const userIDRegex = /^[0-9a-f]{24}$/;

/**
 * Returns if a query is in a correct format to go further.
 * @param query The query.
 * @returns true if the query is a valid username OR userID format (doesn't have to actually exist)
 */
function validateUserQuery(query: string) {
  const isValidUsername = usernameRegex.test(query);
  const isValidUserID = userIDRegex.test(query);
  return isValidUserID || isValidUsername;
}

async function getUserData(query: string) {
  return userIDRegex.test(query)
    ? await User.findByUserIDUsingAPI(query)
    : await User.findByUsernameUsingAPI(query);
}

/**
 * Organizes the player data (from the database) further.
 * @param data The initial data
 * @param host The host (base) URL. This should be given from another function.
 */
async function organizeData(data: UserInterface, host: string) {
  // set placeholder values
  data.statistics.personalBestScoreOnEasySingleplayerMode.globalRank = -1;
  data.statistics.personalBestScoreOnStandardSingleplayerMode.globalRank = -1;

  // get leaderboards rank
  const easyLeaderboardRank = await getRankForUser(data._id, `easy`, host);
  const standardLeaderboardRank = await getRankForUser(
    data._id,
    `standard`,
    host
  );

  // add leaderboards data
  if (easyLeaderboardRank !== null) {
    data.statistics.personalBestScoreOnEasySingleplayerMode.globalRank =
      easyLeaderboardRank;
  }
  if (standardLeaderboardRank !== null) {
    data.statistics.personalBestScoreOnStandardSingleplayerMode.globalRank =
      standardLeaderboardRank;
  }

  return data;
}

/**
 * Returns whether the rank position that a user is in a mode and the rank (if exists).
 * @param userID The User ID to find rank of
 * @param mode The gamemode to find rank on
 * @param host The host (base) url. This should be given from another function.
 * @returns Rank number if record exists in leaderboard (top N), null otherwise.
 */
async function getRankForUser(userID: string, mode: string, host: string) {
  const response = await fetch(`${host}/api/leaderboards/${mode}`);
  const data: Array<LeaderboardsAPIResponse> = await response.json();
  const rank = data.findIndex(
    (r: LeaderboardsAPIResponse) => r.playerID.toString() === userID.toString()
  );
  return rank === -1 ? null : rank + 1;
}

router.get("/api/users/:user", limiter, async (request, response) => {
  // check if user is actually specified
  if (!request?.params?.user) {
    log.warn(`Invalid User Request: Missing user parameter.`);
    response.status(400).json("Invalid Request.");
    return;
  }

  // get user data
  const user: any = request.params.user;
  const sanitized: string = mongoDBSanitize.sanitize(user) as string;
  const host = `${request.protocol}://${request.get("Host")}`;
  if (!validateUserQuery(sanitized)) {
    log.warn(`Invalid User Request: Invalid user username/ID. (${sanitized})`);
    response.status(400).json("Invalid Request.");
    return;
  }

  // get data
  const data: UserInterface = _.cloneDeep(await getUserData(sanitized));
  if (!data) {
    log.warn(`Invalid User Request: User not found. (${sanitized})`);
    response.status(404).json("Not Found.");
    return;
  }

  // organize data
  await organizeData(data, host);
  // send data
  response.status(200).json(data);
});

export { router };
