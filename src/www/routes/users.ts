import express, { Request } from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
import {
  formatToRelativeTime,
  millisecondsToTime
} from "../core/format-number";
import { apiBaseURL } from "../server";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
const fetch = require("node-fetch");

// TODO: Make a better placeholder
const scorePlaceholder = {
  "score": "N/A",
  "timeInMilliseconds": "",
  "scoreSubmissionDateAndTime": "",
  "actionsPerformed": "",
  "enemiesKilled": "",
  "enemiesCreated": "",
  "globalRank": ""
};

router.get("/users/:query", limiter, async (request, response) => {
  const data = await getData(request);
  if (typeof data === "undefined" || data == null) {
    response.render("pages/404");
    return;
  }
  response.render("pages/users", { data: data });
});

async function getData(request: Request) {
  const query = request.params.query;
  const fetchResponse = await fetch(`${apiBaseURL}/users/${query}`);
  const responseJSON = await fetchResponse.json();
  const data = responseJSON.data;
  if (data.statusCode === 404) {
    return null;
  }
  //
  let level = getLevel(data.statistics?.totalExperiencePoints);
  let rank = getRank(data.membership);

  // easy rank
  let easyRank =
    data?.statistics?.personalBestScoreOnEasySingleplayerMode?.globalRank;
  let standardRank =
    data?.statistics?.personalBestScoreOnStandardSingleplayerMode?.globalRank;
  let easyRankText =
    easyRank <= 0 || easyRank > 100 || isNaN(easyRank)
      ? ""
      : `Global Rank #${easyRank}`;
  let easyRankClass = "";
  if (easyRank === 1) {
    easyRankClass = "user-data-box__stat--gold";
  } else if (easyRank === 2) {
    easyRankClass = "user-data-box__stat--silver";
  } else if (easyRank === 3) {
    easyRankClass = "user-data-box__stat--bronze";
  } else if (easyRank <= 10) {
    easyRankClass = "user-data-box__stat--top10";
  } else if (easyRank <= 100) {
    easyRankClass = "user-data-box__stat--top100";
  }

  // easy rank

  let standardRankText =
    standardRank <= 0 || standardRank > 100 || isNaN(standardRank)
      ? ""
      : `Global Rank #${standardRank}`;
  let standardRankClass = "";
  if (standardRank === 1) {
    standardRankClass = "user-data-box__stat--gold";
  } else if (standardRank === 2) {
    standardRankClass = "user-data-box__stat--silver";
  } else if (standardRank === 3) {
    standardRankClass = "user-data-box__stat--bronze";
  } else if (standardRank <= 10) {
    standardRankClass = "user-data-box__stat--top10";
  } else if (standardRank <= 100) {
    standardRankClass = "user-data-box__stat--top100";
  }

  // relative format data

  const [timeSinceJoin, timeSinceStandardPB, timeSinceEasyPB] =
    relativeFormatTimes(data);

  const formattedData = {
    username: data.username,
    level: {
      current: level.level,
      toNext: level.progressToNext,
      totalEXP: data.statistics?.totalExperiencePoints || 0
    },
    rank: {
      rank: rank.title,
      color: rank.color
    },
    multiplayer: {
      won: data?.statistics?.multiplayer?.gamesWon,
      played: data?.statistics?.multiplayer?.gamesPlayed
    },
    joinDate: data.creationDateAndTime,
    userID: data._id,
    easyBest:
      data?.statistics?.personalBestScoreOnEasySingleplayerMode ||
      scorePlaceholder,
    standardBest:
      data?.statistics?.personalBestScoreOnStandardSingleplayerMode ||
      scorePlaceholder,
    easyRank: easyRank,
    easyRankText: easyRankText,
    easyRankClass: easyRankClass,
    standardRank: standardRank,
    standardRankText: standardRankText,
    standardRankClass: standardRankClass,
    // new stuff in 0.6.0
    // general
    timeSinceJoinDate: formatToRelativeTime(timeSinceJoin, 1, false),
    // standard
    timeSinceStandardBest: formatToRelativeTime(timeSinceStandardPB, 1, false),
    formattedStandardBestTime: millisecondsToTime(
      data?.statistics?.personalBestScoreOnStandardSingleplayerMode
        .timeInMilliseconds || 0
    ),
    // easy
    timeSinceEasyBest: formatToRelativeTime(timeSinceEasyPB, 1, false),
    formattedEasyBestTime: millisecondsToTime(
      data?.statistics?.personalBestScoreOnEasySingleplayerMode
        .timeInMilliseconds || 0
    )
  };
  return formattedData;
}

function relativeFormatTimes(data: any) {
  const timeSinceJoin = data.creationDateAndTime
    ? Date.now() - new Date(data.creationDateAndTime).getTime()
    : null;
  const timeSinceStandardPB = data?.statistics
    ?.personalBestScoreOnStandardSingleplayerMode?.scoreSubmissionDateAndTime
    ? Date.now() -
      new Date(
        data.statistics.personalBestScoreOnStandardSingleplayerMode.scoreSubmissionDateAndTime
      ).getTime()
    : null;
  const timeSinceEasyPB = data?.statistics
    ?.personalBestScoreOnEasySingleplayerMode?.scoreSubmissionDateAndTime
    ? Date.now() -
      new Date(
        data.statistics.personalBestScoreOnEasySingleplayerMode.scoreSubmissionDateAndTime
      ).getTime()
    : null;
  return [timeSinceJoin, timeSinceStandardPB, timeSinceEasyPB];
}

function getLevel(experiencePoints: number | undefined) {
  if (typeof experiencePoints !== "number") {
    return {
      level: 0,
      progressToNext: 0
    };
  }
  let level = 0;
  let stock = experiencePoints;
  while (stock > 100 * 1.1 ** level) {
    stock -= 100 * 1.1 ** level;
    level++;
  }
  return {
    level: level,
    progressToNext: stock / (100 * 1.1 ** level + 1)
  };
}

// TODO: change type
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
  return { title: "(No Rank)", color: "#eeeeee" };
}

export { router };
