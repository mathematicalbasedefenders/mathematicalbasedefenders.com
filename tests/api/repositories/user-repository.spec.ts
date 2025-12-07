import * as chai from "chai";
chai.should();

import UserRepository from "../../../src/api/repositories/UserRepository";

describe("UserRepository ", function () {
  it("should return 400 when find by if invalid user is given", async function () {
    const query = "???";

    const userRepository = new UserRepository();
    const result = await userRepository.getUserData(query);
    const statusCode = result.statusCode;
    statusCode.should.equal(400);
  });

  it("should return 404 when find by if non-existent user is given", async function () {
    const query = "userDoesNotExist";

    const userRepository = new UserRepository();
    const result = await userRepository.getUserData(query);
    const statusCode = result.statusCode;
    statusCode.should.equal(404);
  });

  it("should return 200 when find by if existing user is given", async function () {
    const query = "User001";

    const userRepository = new UserRepository();
    const result = await userRepository.getUserData(query);
    const statusCode = result.statusCode;
    statusCode.should.equal(200);
  });
});
