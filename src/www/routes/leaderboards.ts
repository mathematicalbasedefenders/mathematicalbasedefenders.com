import express from "express";
var router = express.Router();
const fetch = require("node-fetch");
import rateLimit from "express-rate-limit";
import _ from "lodash";
import {
  formatToRelativeTime,
  millisecondsToTime
} from "../core/format-number";
import { apiBaseURL } from "../../server";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

interface LeaderboardsRecord {
  statistics: {
    timeInMilliseconds: number;
    scoreSubmissionDateAndTime: Date | string;
    time: string;
    timeSinceRecord: string;
  };
}

router.get("/leaderboards", limiter, async (request, response) => {
  response.redirect("/leaderboards/standard");
});

router.get("/leaderboards/:mode", limiter, async (request, response) => {
  if (request.params.mode !== "easy" && request.params.mode !== "standard") {
    return;
  }
  const fetchResponse = await fetch(
    `${apiBaseURL}/leaderboards/${request.params.mode}`
  );
  const responseJSON = await fetchResponse.json();
  const data = responseJSON.data;
  console.debug(0, data);
  data.map((record: LeaderboardsRecord) => {
    record.statistics.time = millisecondsToTime(
      record.statistics.timeInMilliseconds
    );
    const recordSetOn = new Date(
      record.statistics.scoreSubmissionDateAndTime
    ).getTime();
    record.statistics.timeSinceRecord = formatToRelativeTime(
      Date.now() - recordSetOn,
      1,
      false
    );
  });
  const mode = _.startCase(request.params.mode);
  response.render("pages/leaderboards", { data: data, mode: mode });
});

export { router };
