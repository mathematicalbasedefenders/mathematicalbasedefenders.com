// App must be running before running this test

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

const BASE_URL = "http://localhost:8000";

chai.should();
chai.use(chaiAsPromised);

describe("/api/users api route", function () {
  it("should 404 if no user is given", async function () {
    const result = await fetch(`${BASE_URL}/api/users`);
    const statusCode = result.status;
    statusCode.should.equal(404);
  });

  it("should 400 if invalid user length is given", async function () {
    // invalid in length
    const result = await fetch(`${BASE_URL}/api/users/1234567890123456789012`);
    const statusCode = result.status;
    statusCode.should.equal(400);
  });

  it("should 400 if invalid user format is given", async function () {
    // invalid in format
    const result = await fetch(`${BASE_URL}/api/users/*2334352523$`);
    const statusCode = result.status;
    statusCode.should.equal(400);
  });

  it("should 400 if invalid user length and format is given", async function () {
    // invalid in both length and format
    const result = await fetch(`${BASE_URL}/api/users/*2345678901234567890.$`);
    const statusCode = result.status;
    statusCode.should.equal(400);
  });

  it("should 404 if unknown user is given", async function () {
    // assuming user mistertfy64-unknown doesn't exist
    const result = await fetch(`${BASE_URL}/api/users/mistertfy64-unknown`);
    const statusCode = result.status;
    statusCode.should.equal(404);
  });

  it("should return a valid result if known user is given", async function () {
    // assuming user mistertfy64 exists
    const result = await fetch(`${BASE_URL}/api/users/mistertfy64`);
    const statusCode = result.status;
    const data = await result.json();
    statusCode.should.not.equal(400);
    statusCode.should.not.equal(404);
    data.should.have.property("statistics");
    data.should.have.nested.property(
      "statistics.personalBestScoreOnEasySingleplayerMode"
    );
    data.should.have.nested.property(
      "statistics.personalBestScoreOnStandardSingleplayerMode"
    );
    data.should.have.nested.property("statistics.multiplayer");
    data.should.have.nested.property("statistics.gamesPlayed");
    data.should.have.nested.property("statistics.totalExperiencePoints");
    data.should.have.property("membership");
    data.should.have.property("creationDateAndTime");
    data.should.have.property("username");
    data.should.have.property("_id");
  });
});
