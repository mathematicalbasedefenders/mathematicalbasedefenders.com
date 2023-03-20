import express from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
import { getScoresOfAllPlayers } from "../services/leaderboards";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
import { addLogMessageMetadata, LogMessageLevel } from "../core/log";
import {
  EasyModeLeaderboardsRecord,
  EasyModeLeaderboardsRecordInterface
} from "../models/EasyModeLeaderboardsRecord";
import {
  StandardModeLeaderboardsRecord,
  StandardModeLeaderboardsRecordInterface
} from "../models/StandardModeLeaderboardsRecord";
import _ from "lodash";

router.get("/api/leaderboards/:mode", limiter, async (request, response) => {
  let data = await getScoresOfAllPlayers(`${request.params.mode}Singleplayer`);
  data = data.map((player) => {
    return {
      statistics:
        player.statistics[
          `personalBestScoreOn${_.startCase(
            request.params.mode
          )}SingleplayerMode`
        ],
      _id: player._id,
      username: player.username
    };
  });
  response.status(200).json(data);
});

export { router };
