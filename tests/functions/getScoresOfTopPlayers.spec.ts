// App must be running before running this test

import { getScoresOfTopPlayers } from "../../src/server/services/leaderboards";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.should();
chai.use(chaiAsPromised);

// this should be set to 2 or 3 in case testing data doesn't have that much players
const RECORD_AMOUNT = 3;

describe("easy singleplayer data retrieval ", function () {
  it("should have data", async function () {
    const data = await getScoresOfTopPlayers("easySingleplayer", RECORD_AMOUNT);
    data.should.be.an("array");
  });
});

describe("standard singleplayer data retrieval ", function () {
  it("should have data", async function () {
    const data = await getScoresOfTopPlayers(
      "standardSingleplayer",
      RECORD_AMOUNT
    );
    data.should.be.an("array");
  });
});
