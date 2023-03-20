import { addLogMessageMetadata, LogMessageLevel } from "../core/log.js";
import { User } from "../models/User.js";
// Stolen from play subdomain's repository
async function getScoresOfAllPlayers(gameMode: string) {
  let startTime = Date.now();
  let key = "";
  let players: Array<any> = [];
  switch (gameMode) {
    case "easySingleplayer": {
      key = "Easy";
      players = await User.getAllEasySingleplayerBestScores();
      break;
    }
    case "standardSingleplayer": {
      key = "Standard";
      players = await User.getAllStandardSingleplayerBestScores();
      break;
    }
  }
  console.log(
    addLogMessageMetadata(
      `Starting ${key} score querying.`,
      LogMessageLevel.INFO
    )
  );
  let sorted = players
    .filter(
      // TODO: For now, but it works, so don't touch it!
      (element: any) =>
        typeof element[`statistics`][
          `personalBestScoreOn${key}SingleplayerMode`
        ] !== "undefined"
    )
    .sort(
      (a, b) =>
        a[`statistics`][`personalBestScoreOn${key}SingleplayerMode`].score -
        b[`statistics`][`personalBestScoreOn${key}SingleplayerMode`].score
    )
    .reverse()
    .slice(0, 100);
  console.log(
    addLogMessageMetadata(
      `${key} score querying took ${Date.now() - startTime}ms`,
      LogMessageLevel.INFO
    )
  );
  return sorted;
}

export { getScoresOfAllPlayers };
