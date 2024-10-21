// App must be running before running this test

import { getScoresOfTopPlayers } from "../../src/server/services/leaderboards";

// this should be set to 2 or 3 in case testing data doesn't have that much players
const RECORD_AMOUNT = 3;

test("easy singleplayer should have data", () => {
  getScoresOfTopPlayers("easySingleplayer", RECORD_AMOUNT).then((data) => {
    expect(data).toHaveLength(RECORD_AMOUNT);
  });
});

test("standard singleplayer should have data", () => {
  getScoresOfTopPlayers("standardSingleplayer", RECORD_AMOUNT).then((data) => {
    expect(data).toHaveLength(RECORD_AMOUNT);
  });
});
