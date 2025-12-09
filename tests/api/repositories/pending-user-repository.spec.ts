import { sha256 } from "js-sha256";
import PendingUserRepository from "../../../src/api/repositories/PendingUserRepository";
import {
  getMockConfirmationCode,
  getMockPendingUserEmail
} from "../../mock-data-generator";

describe("PendingUserRepository", function () {
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

    it("should return status code 400 if it's a duplicate email (verified user)", async function () {
      const data = {
        email: "user001@example.com",
        username: "pendingUserToCreate",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if it's a duplicate username (verified user)", async function () {
      const data = {
        email: "PendingUserToCreate@example.com",
        username: "User001",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if it's a duplicate email (another pending user)", async function () {
      const firstData = {
        email: "PendingUserToCreate@example.com",
        username: "pendingUserToCreate1",
        password: "password123"
      };

      const secondData = {
        email: "PendingUserToCreate@example.com",
        username: "pendingUserToCreate2",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      await pendingUserRepository.createPendingUser(firstData);
      const result = await pendingUserRepository.createPendingUser(secondData);

      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if it's a duplicate username (another pending user)", async function () {
      const firstData = {
        email: "PendingUserToCreate1@example.com",
        username: "pendingUserToCreate1",
        password: "password123"
      };

      const secondData = {
        email: "PendingUserToCreate2@example.com",
        username: "pendingUserToCreate1",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      await pendingUserRepository.createPendingUser(firstData);
      const result = await pendingUserRepository.createPendingUser(secondData);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });
  });

  describe(".verifyPendingUser()", function () {
    it("should return status code 200 if email and code is correct", async function () {
      const email = getMockPendingUserEmail(1);
      const hashedEmail = sha256(email);
      const code = getMockConfirmationCode(1);

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.verifyPendingUser(
        hashedEmail,
        code
      );
      const statusCode = result.statusCode;
      statusCode.should.equal(200);
    });

    it("should return status code 400 if email is correct but code is incorrect", async function () {
      const email = getMockPendingUserEmail(1);
      const code = getMockConfirmationCode(3);

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.verifyPendingUser(email, code);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if email is incorrect but code is correct", async function () {
      const email = getMockPendingUserEmail(3);
      const code = getMockConfirmationCode(1);

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.verifyPendingUser(email, code);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });
  });
});
