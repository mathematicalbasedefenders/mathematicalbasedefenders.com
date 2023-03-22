import express, { Request } from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
const fetch = require("node-fetch");
const userRegEx = /[A-Za-z0-9_]{3,20}/;
const userIDRegEx = /[0-9a-f]{24}/g;

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
  response.render("pages/users", { data: await getData(request) });
});

async function getData(request: Request) {
  let query = request.params.query;
  if (
    !(
      (userRegEx.test(query) && query.length >= 3 && query.length <= 20) ||
      (userIDRegEx.test(query) && query.length == 24)
    )
  ) {
    return;
  }
  let data = await fetch(
    `${request.protocol}://${request.get("Host")}/api/users/${query}`
  );
  data = await data.json();
  //
  let level = getLevel(data.statistics.totalExperiencePoints);
  let rank = getRank(data.membership);
  //
  let formattedData = {
    username: data.username,
    level: {
      current: level.level,
      toNext: level.progressToNext
    },
    rank: {
      rank: rank.title,
      color: rank.color
    },
    joinDate: data.creationDateAndTime,
    userID: data._id,
    easyBest:
      data?.statistics?.personalBestScoreOnEasySingleplayerMode ||
      scorePlaceholder,
    standardBest:
      data?.statistics?.personalBestScoreOnStandardSingleplayerMode ||
      scorePlaceholder
  };
  return formattedData;
}

function getLevel(experiencePoints: number) {
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
function getRank(membership: any) {
  // TODO: Refactor this stupid thing already
  if (membership?.isDeveloper) {
    return { title: "Developer", color: "#ff0000" };
  }
  if (membership?.isAdministrator) {
    return { title: "Administrator", color: "#da1717" };
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