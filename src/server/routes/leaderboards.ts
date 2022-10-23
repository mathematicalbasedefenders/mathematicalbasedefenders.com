import express from "express";
var router = express.Router();

import _ from "lodash";
import mongoDBSanitize from "express-mongo-sanitize";
const axios = require("axios").default;
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
import { addLogMessageMetadata, LogMessageLevel } from "../core/log.js";
import * as utilities from "../core/utilities";

import { User, UserInterface } from "../models/User";

router.get("/leaderboards", limiter, async (request, response) => {
  response.redirect("/leaderboards/standard");
  return;
});

router.get(
  "/leaderboards/:mode",
  limiter,
  async (request: any, response: any) => {
    let leaderboardData;
    let sanitized: any = mongoDBSanitize.sanitize(request.params.mode);
    let mode = DOMPurify.sanitize(sanitized as string);
    let startCasedMode = _.startCase(mode);

    if (!mode) {
      response.redirect("/leaderboards/standard");
      return;
    }

    try {
      // FIXME: Dangerous??
      leaderboardData = await axios.get(
        `${request.protocol}://${request.get("Host")}/api/leaderboards/${mode}`
      );
      leaderboardData = leaderboardData.data;
    } catch (error: any) {
      console.error(addLogMessageMetadata(error.stack, LogMessageLevel.ERROR));
    }

    let playerData: Array<(string | UserInterface)[]> = [];

    for (let i = 1; i <= 50; i++) {
      let objectID;
      for (let object of leaderboardData) {
        if (object.rankNumber === i) {
          objectID = object.userIDOfHolder.toString();
          break;
        }
      }

      if (objectID != "???") {
        // users that hold a rank
        let playerRecord: UserInterface | null =
          await User.findByUserIDUsingAPI(objectID);

        if (typeof playerRecord === "object") {
          let playerDataForPlayer: (string | UserInterface)[] = [];
          playerDataForPlayer.push(
            playerRecord?.username ?? "(Unable to get username.)"
          );
          playerDataForPlayer.push(utilities.calculateRank(playerRecord));
          playerDataForPlayer.push(
            utilities.getRankColor(utilities.calculateRank(playerRecord))
          );
          playerDataForPlayer.push(playerRecord);
          playerData.push(playerDataForPlayer);
        }
      }
    }

    response.render("pages/leaderboards", {
      leaderboardData: leaderboardData,
      playerData: playerData,
      gameMode: startCasedMode
    });
  }
);

export { router };
