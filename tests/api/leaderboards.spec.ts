// App must be running before running this test

import { getScoresOfTopPlayers } from "../../src/server/services/leaderboards";
import { condenseData } from "../../src/server/api/leaderboards";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.should();
chai.use(chaiAsPromised);

describe("easy singleplayer leaderboards data retrieval ", function () {
  it("should have correct data format", async function () {
    const modeName = `easySingleplayer`;
    const data = await getScoresOfTopPlayers(modeName, 100);
    const condensedData = condenseData(data, modeName);
    for (const record of condensedData) {
      record.should.have.property("playerID");
      record.should.have.property("statistics");
      record.should.have.property("username");
    }
  });
});

describe("standard singleplayer leaderboards data retrieval ", function () {
  it("should have correct data format", async function () {
    const modeName = `standardSingleplayer`;
    const data = await getScoresOfTopPlayers(modeName, 100);
    const condensedData = condenseData(data, modeName);
    for (const record of condensedData) {
      record.should.have.property("playerID");
      record.should.have.property("statistics");
      record.should.have.property("username");
    }
  });
});
