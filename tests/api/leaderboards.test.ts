// App must be running before running this test

import { getScoresOfTopPlayers } from "../../src/server/services/leaderboards";
import { condenseData } from "../../src/server/api/leaderboards";

test("easy singleplayer should have correct data format", () => {
  const modeName = `easySingleplayer`;
  getScoresOfTopPlayers(modeName, 100).then((data) => {
    const condensedData = condenseData(data, modeName);
    test.each(condensedData)("entry should have correct fields", (entry) => {
      expect(entry).toHaveProperty("playerID");
      expect(entry).toHaveProperty("statistics");
      expect(entry).toHaveProperty("username");
    });
  });
});

test("standard singleplayer should have correct data format", () => {
  const modeName = `standardSingleplayer`;
  getScoresOfTopPlayers(modeName, 100).then((data) => {
    const condensedData = condenseData(data, modeName);
    test.each(condensedData)("entry should have correct fields", (entry) => {
      expect(entry).toHaveProperty("playerID");
      expect(entry).toHaveProperty("statistics");
      expect(entry).toHaveProperty("username");
    });
  });
});
