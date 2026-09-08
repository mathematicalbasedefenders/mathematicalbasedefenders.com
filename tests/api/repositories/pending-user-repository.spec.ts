import * as chai from "chai";
const should = chai.should();

import mongoose from "mongoose";
import { sha256 } from "js-sha256";
import bcrypt from "bcrypt";
import PendingUserRepository from "../../../src/api/repositories/PendingUserRepository";
import { PendingUser } from "../../../src/api/models/PendingUser";
import { User } from "../../../src/api/models/User";
import Metadata from "../../../src/api/models/Metadata";
import {
  getMockConfirmationCode,
  getMockPendingUserEmail
} from "../../mock-data-generator";

describe("PendingUserRepository", function () {
  describe(".createPendingUser()", function () {
    it("should return status code 201 if data is valid", async function () {
      const data = {
        email: "PendingUserToCreate@example.com",
        username: "unverified_user",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(201);

      const pendingUser = await PendingUser.findOne({
        emailAddress: data.email.toLowerCase()
      });
      should.exist(pendingUser);
      pendingUser?.username.should.equal(data.username);
      pendingUser?.usernameInAllLowercase.should.equal(
        data.username.toLowerCase()
      );
      pendingUser?.hashedEmailAddress.should.equal(
        sha256(data.email.toLowerCase())
      );
      pendingUser?.hashedPassword.should.not.equal(data.password);
      (
        await bcrypt.compare(data.password, pendingUser?.hashedPassword ?? "")
      ).should.equal(true);
    });

    it("should return status code 400 if email is empty", async function () {
      const data = {
        email: "",
        username: "unverified_user",
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
        username: "unverified_user",
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
        username: "unverified_user",
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
        username: "unverified_user",
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
        username: "unverified_user",
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
        username: "unverified_user1",
        password: "password123"
      };

      const secondData = {
        email: "PendingUserToCreate@example.com",
        username: "unverified_user2",
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
        username: "unverified_user1",
        password: "password123"
      };

      const secondData = {
        email: "PendingUserToCreate2@example.com",
        username: "unverified_user1",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      await pendingUserRepository.createPendingUser(firstData);
      const result = await pendingUserRepository.createPendingUser(secondData);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if it's a duplicate email, even if case doesn't match (verified user)", async function () {
      const data = {
        email: "USer001@EXAMPLE.com",
        username: "unverified_user",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if it's a duplicate username, even if case doesn't match (verified user)", async function () {
      const data = {
        email: "PendingUserToCreate@example.com",
        username: "USER001",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.createPendingUser(data);
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if it's a duplicate email, even if case doesn't match (another pending user)", async function () {
      const firstData = {
        email: "PENDINGUSERTOCREATE@example.com",
        username: "pendingUser21",
        password: "password123"
      };

      const secondData = {
        email: "PendingUserToCreate@example.com",
        username: "pendingUser72",
        password: "password123"
      };

      const pendingUserRepository = new PendingUserRepository();
      await pendingUserRepository.createPendingUser(firstData);
      const result = await pendingUserRepository.createPendingUser(secondData);

      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if it's a duplicate username, even if case doesn't match (another pending user)", async function () {
      const firstData = {
        email: "PendingUserToCreate1@example.com",
        username: "unverified222",
        password: "password123"
      };

      const secondData = {
        email: "PendingUserToCreate2@example.com",
        username: "UNVERIFIED222",
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
    it("should return status code 201 if email and code is correct", async function () {
      const email = getMockPendingUserEmail(1);
      const hashedEmail = sha256(email);
      const code = getMockConfirmationCode(1);
      await Metadata.create({
        _id: new mongoose.Types.ObjectId(),
        usersRegistered: 5,
        documentIsMetadata: true
      });

      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.verifyPendingUser(
        hashedEmail,
        code
      );
      const statusCode = result.statusCode;
      statusCode.should.equal(201);

      const pendingUser = await PendingUser.findOne({ emailAddress: email });
      const user = await User.findOne({ emailAddress: email });
      const metadata = await Metadata.findOne({ documentIsMetadata: true });
      should.not.exist(pendingUser);
      should.exist(user);
      user?.username.should.equal("PendingUser001");
      metadata?.usersRegistered.should.equal(6);
    });

    it("should return status code 400 for a non-string hashed email", async function () {
      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.verifyPendingUser(
        123 as unknown as string,
        getMockConfirmationCode(1)
      );

      result.success.should.equal(false);
      result.statusCode.should.equal(400);
      result.error?.should.equal("Invalid credentials.");
    });

    it("should return status code 400 for a non-string confirmation code", async function () {
      const pendingUserRepository = new PendingUserRepository();
      const result = await pendingUserRepository.verifyPendingUser(
        sha256(getMockPendingUserEmail(1)),
        123 as unknown as string
      );

      result.success.should.equal(false);
      result.statusCode.should.equal(400);
      result.error?.should.equal("Invalid credentials.");
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
