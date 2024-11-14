import express from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
import { getScoresOfTopPlayers } from "../services/leaderboards";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

import _ from "lodash";
import { UserInterface } from "../models/User";
import { log } from "../core/log";
import { getUserRank } from "../services/user";

router.get("/api/leaderboards/:mode", limiter, async (request, response) => {
  if (!["easy", "standard"].includes(request.params.modes)) {
    response.status(400).json({ error: "Invalid leaderboards mode." });
  }

  const modeName = `${request.params.mode}Singleplayer`;
  const data = await getScoresOfTopPlayers(modeName, 100);
  const condensedData = condenseData(data, modeName);
  response.status(200).json(condensedData);
});

function condenseData(data: Array<UserInterface>, modeName: string) {
  if (modeName === `easySingleplayer`) {
    const newData = data.map((player) => {
      return {
        statistics: player.statistics.personalBestScoreOnEasySingleplayerMode,
        playerID: player._id,
        username: player.username,
        color: getUserRank(player.membership).color
      };
    });
    return newData;
  } else if (modeName === `standardSingleplayer`) {
    const newData = data.map((player) => {
      return {
        statistics:
          player.statistics.personalBestScoreOnStandardSingleplayerMode,
        playerID: player._id,
        username: player.username,
        color: getUserRank(player.membership).color
      };
    });
    return newData;
  } else {
    log.error(`Unknown mode name while getting top player data: ${modeName}`);
    return null;
  }
}

export { router, condenseData };
