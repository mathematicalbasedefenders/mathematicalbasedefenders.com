import _ from "lodash";
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
      players = await User.getEasySingleplayerBestScores(100);
      break;
    }
    case "standardSingleplayer": {
      players = await User.getStandardSingleplayerBestScores(100);
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
      const scoreKey =
        "statistics.personalBestScoreOnEasySingleplayerMode.score";
      const timestampKey =
        "statistics.personalBestScoreOnEasySingleplayerMode.scoreSubmissionDateAndTime";
      sorted.sort((a: UserInterface, b: UserInterface) =>
        sortRank(a, b, scoreKey, timestampKey)
      );
      break;
    }
    case "Standard": {
      const scoreKey =
        "statistics.personalBestScoreOnStandardSingleplayerMode.score";
      const timestampKey =
        "statistics.personalBestScoreOnStandardSingleplayerMode.scoreSubmissionDateAndTime";
      sorted.sort((a: UserInterface, b: UserInterface) =>
        sortRank(a, b, scoreKey, timestampKey)
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

function sortRank(
  a: UserInterface,
  b: UserInterface,
  scoreKey: string,
  timestampKey: string
) {
  if (_.get(a, scoreKey) === _.get(b, scoreKey)) {
    return _.get(a, timestampKey) < _.get(b, timestampKey) ? 1 : -1;
  }
  return _.get(a, scoreKey) > _.get(b, scoreKey) ? 1 : -1;
}

export { getScoresOfTopPlayers };
