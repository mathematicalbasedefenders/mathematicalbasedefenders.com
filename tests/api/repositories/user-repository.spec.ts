import * as chai from "chai";
const should = chai.should();

import UserRepository from "../../../src/api/repositories/UserRepository";
import { User } from "../../../src/api/models/User";
import { getMockUserEmail } from "../../mock-data-generator";
import bcrypt from "bcrypt";

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
      result.success.should.equal(true);

      const data = result.data as {
        username: string;
        emailAddress?: string;
        hashedPassword?: string;
      };
      data.username.should.equal(query);
      should.not.exist(data.emailAddress);
      should.not.exist(data.hashedPassword);
    });

    it("should find a user by username without regard to letter case", async function () {
      const userRepository = new UserRepository();
      const result = await userRepository.getUserData("uSeR001");

      result.statusCode.should.equal(200);
      (result.data as { username: string }).username.should.equal("User001");
    });

    it("should find a user by object ID", async function () {
      const existingUser = await User.findOne({
        emailAddress: getMockUserEmail(1)
      });
      should.exist(existingUser);

      const userRepository = new UserRepository();
      const result = await userRepository.getUserData(
        existingUser?._id.toString() ?? ""
      );

      result.statusCode.should.equal(200);
      (result.data as { username: string }).username.should.equal("User001");
    });

    it("should add a user's global ranks to their personal bests", async function () {
      const submissionDate = new Date("2025-01-01T00:00:00.000Z");
      await User.updateOne(
        { usernameInAllLowercase: "user001" },
        {
          $set: {
            "statistics.personalBestScoreOnEasySingleplayerMode": {
              score: 100,
              scoreSubmissionDateAndTime: submissionDate
            },
            "statistics.personalBestScoreOnStandardSingleplayerMode": {
              score: 200,
              scoreSubmissionDateAndTime: submissionDate
            }
          }
        }
      );

      const userRepository = new UserRepository();
      const result = await userRepository.getUserData("User001");
      const data = result.data as {
        statistics: {
          personalBestScoreOnEasySingleplayerMode: { globalRank: number };
          personalBestScoreOnStandardSingleplayerMode: { globalRank: number };
        };
      };

      data.statistics.personalBestScoreOnEasySingleplayerMode.globalRank.should.equal(
        1
      );
      data.statistics.personalBestScoreOnStandardSingleplayerMode.globalRank.should.equal(
        1
      );
    });
  });

  describe(".changePasswordForEmail()", function () {
    it("should return status code 404 if the user does not exist", async function () {
      const userRepository = new UserRepository();
      const result = await userRepository.changePasswordForEmail(
        "missing@example.com",
        "unused-hash"
      );

      result.success.should.equal(false);
      result.statusCode.should.equal(404);
    });

    it("should update the stored password", async function () {
      const newPassword = "replacementPassword";
      const newHashedPassword = await bcrypt.hash(newPassword, 4);
      const userRepository = new UserRepository();
      const result = await userRepository.changePasswordForEmail(
        getMockUserEmail(1),
        newHashedPassword
      );

      result.success.should.equal(true);
      result.statusCode.should.equal(200);
      const updatedUser = await User.findOne({
        emailAddress: getMockUserEmail(1)
      });
      updatedUser?.hashedPassword.should.equal(newHashedPassword);
    });
  });

  describe(".createUser()", function () {
    it("should persist a user with safe default statistics and membership", async function () {
      const userData = {
        username: "CreatedUser",
        usernameInAllLowercase: "createduser",
        emailAddress: "created-user@example.com",
        hashedPassword: "hashed-password"
      };

      const userRepository = new UserRepository();
      const result = await userRepository.createUser(userData);
      const createdUser = await User.findOne({
        emailAddress: userData.emailAddress
      });

      result.success.should.equal(true);
      result.statusCode.should.equal(201);
      should.exist(createdUser);
      createdUser?.statistics.gamesPlayed.should.equal(0);
      createdUser?.membership.isDeveloper.should.equal(false);
      createdUser?.membership.isAdministrator.should.equal(false);
      createdUser?.membership.specialRank.should.equal("");
    });
  });
});
