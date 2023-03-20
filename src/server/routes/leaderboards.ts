import express from "express";
var router = express.Router();

import rateLimit from "express-rate-limit";
import _ from "lodash";
import { getScoresOfAllPlayers } from "../core/leaderboards";
import { User } from "../models/User";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/leaderboards/:mode", limiter, async (request, response) => {
  if (request.params.mode !== "easy" && request.params.mode !== "standard") {
    return;
  }
  let data = await getScoresOfAllPlayers(`${request.params.mode}Singleplayer`);
  let mode = _.startCase(request.params.mode);
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
  response.render("pages/leaderboards", { data: data, mode: mode });
});

export { router };
