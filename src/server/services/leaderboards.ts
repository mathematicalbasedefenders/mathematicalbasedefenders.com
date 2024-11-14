import { log } from "../core/log";
import { User, UserInterface } from "../models/User";

async function getScoresOfTopPlayers(gameMode: string, amount: number) {
  const startTime = Date.now();
  const key = getKeyName(gameMode);
  log.info(`Starting ${key} score querying.`);
  const players: Array<UserInterface> = await fetchPlayersData(gameMode);
  const sorted = sortPlayersData(players, key, amount);
  log.info(`${key} score querying took ${Date.now() - startTime}ms`);
  return sorted;
}

function getKeyName(gameMode: string) {
  switch (gameMode) {
    case "easySingleplayer": {
      return "Easy";
    }
    case "standardSingleplayer": {
      return "Standard";
    }
  }
  log.error(`Unknown game mode while getting top player data: ${gameMode}`);
  throw new Error(`Unknown game mode while getting player data: ${gameMode}`);
}

async function fetchPlayersData(gameMode: string) {
  let players: Array<UserInterface> = [];
  switch (gameMode) {
    case "easySingleplayer": {
      players = await User.getAllEasySingleplayerBestScores();
      break;
    }
    case "standardSingleplayer": {
      players = await User.getAllStandardSingleplayerBestScores();
      break;
    }
    default: {
      log.error(`Unknown game mode while getting top player data: ${gameMode}`);
      throw new Error(`Unknown game mode while getting data: ${gameMode}`);
    }
  }
  return players;
}

function sortPlayersData(
  players: Array<UserInterface>,
  key: string,
  amount: number
) {
  const sorted = players.filter(
    // TODO: For now, but it works, so don't touch it!
    (element: any) =>
      typeof element[`statistics`][
        `personalBestScoreOn${key}SingleplayerMode`
      ] !== "undefined"
  );
  switch (key) {
    case "Easy": {
      sorted.sort(
        (a: UserInterface, b: UserInterface) =>
          a.statistics.personalBestScoreOnEasySingleplayerMode.score -
          b.statistics.personalBestScoreOnEasySingleplayerMode.score
      );
      break;
    }
    case "Standard": {
      sorted.sort(
        (a: UserInterface, b: UserInterface) =>
          a.statistics.personalBestScoreOnStandardSingleplayerMode.score -
          b.statistics.personalBestScoreOnStandardSingleplayerMode.score
      );
      break;
    }
    default: {
      log.error(`Unknown key name while sorting top player data: ${key}`);
      throw new Error(`Unknown key name while sorting data: ${key}`);
    }
  }
  return sorted.reverse().slice(0, amount);
}

export { getScoresOfTopPlayers };
