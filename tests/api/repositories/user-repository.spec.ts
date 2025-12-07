import * as chai from "chai";
chai.should();

import UserRepository from "../../../src/api/repositories/UserRepository";

describe("UserRepository", function () {
  describe(".getUserData()", function () {
    it("should return status code 400 if invalid user is given", async function () {
      const query = "???";

      const userRepository = new UserRepository();
      const result = await userRepository.getUserData(query);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 404 if non-existent user is given", async function () {
      const query = "userDoesNotExist";

      const userRepository = new UserRepository();
      const result = await userRepository.getUserData(query);
      const statusCode = result.statusCode;
      statusCode.should.equal(404);
    });

    it("should return status code 200 if existing user is given", async function () {
      const query = "User001";

      const userRepository = new UserRepository();
      const result = await userRepository.getUserData(query);
      const statusCode = result.statusCode;
      statusCode.should.equal(200);
    });
  });
});
