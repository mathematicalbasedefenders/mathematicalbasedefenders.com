import * as chai from "chai";
chai.should();

import PendingUserRepository from "../../../src/api/repositories/PendingUserRepository";

describe("UserRepository", function () {
  describe(".createPendingUser()", function () {
    it("should return status code 200 if data is valid", async function () {
      const data = {
        email: "PendingUserToCreate@example.com",
        username: "pendingUserToCreate",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(200);
    });

    it("should return status code 400 if email is empty", async function () {
      const data = {
        email: "",
        username: "pendingUserToCreate",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if username is empty", async function () {
      const data = {
        email: "PendingUserToCreate@example.com",
        username: "",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if password is empty", async function () {
      const data = {
        email: "PendingUserToCreate@example.com",
        username: "pendingUserToCreate",
        password: ""
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if email is invalid (doesn't match regex)", async function () {
      const data = {
        email: "PendingUserToCreate",
        username: "pendingUserToCreate",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if username is invalid (doesn't match regex)", async function () {
      const data = {
        email: "PendingUserToCreate@example.com",
        username: "ThisUsernameIsMoreThan20CharactersLongDealWithIt",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if password is invalid (doesn't match regex)", async function () {
      const data = {
        email: "PendingUserToCreate@example.com",
        username: "pendingUserToCreate",
        password: "abcde"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });
  });
});
