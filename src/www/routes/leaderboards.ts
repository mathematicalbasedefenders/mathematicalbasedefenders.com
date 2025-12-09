import express from "express";
const router = express.Router();
const fetch = require("node-fetch");

import _ from "lodash";
import {
  formatToRelativeTime,
  millisecondsToTime
} from "../core/format-number";
import { apiBaseURL } from "../server";

interface LeaderboardsRecord {
  membership: { [key: string]: boolean };
  color: string;
  statistics: {
    timeInMilliseconds: number;
    scoreSubmissionDateAndTime: Date | string;
    time: string;
    timeSinceRecord: string;
  };
}

router.get("/leaderboards", async (request, response) => {
  response.redirect("/leaderboards/standard");
});

router.get("/leaderboards/:mode", async (request, response) => {
  if (request.params.mode !== "easy" && request.params.mode !== "standard") {
    response.status(404).render("pages/404");
    return;
  }
  try {
    const fetchResponse = await fetch(
      `${apiBaseURL}/leaderboards/${request.params.mode}`
    );
    if (!fetchResponse.ok) {
      response.status(fetchResponse.status).render("pages/error");
      return;
    }

    const responseJSON = await fetchResponse.json();
    if (!responseJSON.success || !responseJSON.data) {
      response.status(500).render("pages/error");
      return;
    }

    const data = responseJSON.data;
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
      record.color = getRank(record.membership).color;
    });
    const mode = _.startCase(request.params.mode);
    response.render("pages/leaderboards", { data: data, mode: mode });
  } catch (error) {
    response.status(500).render("pages/error");
    return;
  }
});

function getRank(membership: { [key: string]: boolean }) {
  if (membership?.isDeveloper) {
    return { title: "Developer", color: "#ff0000" };
  }
  if (membership?.isAdministrator) {
    return { title: "Administrator", color: "#ff0000" };
  }
  if (membership?.isModerator) {
    return { title: "Moderator", color: "#ff7f00" };
  }
  if (membership?.isContributor) {
    return { title: "Contributor", color: "#01acff" };
  }
  if (membership?.isTester) {
    return { title: "Tester", color: "#5bb1e0" };
  }
  if (membership?.isDonator) {
    return { title: "Donator", color: "#26e02c" };
  }
  // No rank
  return { title: "(No Rank)", color: "#000000" };
}

export { router };
