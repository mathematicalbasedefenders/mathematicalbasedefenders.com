import { log } from "../core/log.js";
import { User, UserInterface } from "../models/User.js";
// Stolen from play subdomain's repository
async function getScoresOfTopPlayers(gameMode: string, amount: number) {
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
  log.info(`Starting ${key} score querying.`);
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
    .slice(0, amount);
  log.info(`${key} score querying took ${Date.now() - startTime}ms`);
  return sorted;
}

export { getScoresOfTopPlayers };
