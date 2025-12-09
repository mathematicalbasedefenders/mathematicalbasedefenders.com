import log from "../core/log";
import { User, UserInterface } from "../models/User";
import RepositoryResponse from "../types/RepositoryResponse";
import LeaderboardsRepository from "./LeaderboardsRepository";

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const USER_ID_REGEX = /^[0-9a-f]{24}$/;

export default class UserRepository {
  async getUserData(query: string): Promise<RepositoryResponse> {
    if (!this.validateQuery(query)) {
      log.warn(
        `Refused to get data from UserRepository: Invalid query ${query}`
      );
      return {
        success: false,
        statusCode: 400,
        error: "Invalid query."
      };
    }

    const isUserID = USER_ID_REGEX.test(query);
    const data: UserInterface = isUserID
      ? await this.getUserDataByUserID(query)
      : await this.getUserDataByUsername(query);

    if (!data) {
      log.warn(`Can't find data from UserRepository: No query ${query}`);
      return {
        success: false,
        statusCode: 404,
        error: "User not found."
      };
    }

    const userID = data._id;
    const leaderboardsRepository = new LeaderboardsRepository();

    const easyLeaderboardsRequest =
      await leaderboardsRepository.getEasySingleplayerLeaderboards();

    if (
      easyLeaderboardsRequest.data &&
      easyLeaderboardsRequest.statusCode === 200
    ) {
      const easyLeaderboardsData = easyLeaderboardsRequest.data;
      if (Array.isArray(easyLeaderboardsData)) {
        const playerRecord = easyLeaderboardsData.find(
          (e) => e._id.toString() === userID.toString()
        );
        if (playerRecord) {
          data.statistics.personalBestScoreOnEasySingleplayerMode.globalRank =
            playerRecord.rank;
        }
      }
    }

    const standardLeaderboardsRequest =
      await leaderboardsRepository.getStandardSingleplayerLeaderboards();

    if (
      standardLeaderboardsRequest.data &&
      standardLeaderboardsRequest.statusCode === 200
    ) {
      const standardLeaderboardsData = standardLeaderboardsRequest.data;
      if (Array.isArray(standardLeaderboardsData)) {
        const playerRecord = standardLeaderboardsData.find(
          (e) => e._id.toString() === userID.toString()
        );
        if (playerRecord) {
          data.statistics.personalBestScoreOnStandardSingleplayerMode.globalRank =
            playerRecord.rank;
        }
      }
    }

    log.info(`Returned data from UserRepository with ${query}`);
    return {
      success: true,
      statusCode: 200,
      data: data
    };
  }

  async getUserDataByUsername(username: string): Promise<UserInterface> {
    return await User.findByUsername(username);
  }

  async getUserDataByUserID(userID: string): Promise<UserInterface> {
    return await User.findByUserID(userID);
  }

  /**
   * This should not be exposed to the end user.
   * This should only be used for internal purposes.
   */
  async getUserDataByEmail(email: string): Promise<UserInterface> {
    return await User.findByEmail(email);
  }

  /**
   * This is for internal use as well.
   */
  async changePasswordForEmail(
    email: string,
    newHashedPassword: string
  ): Promise<RepositoryResponse> {
    const target = { emailAddress: email };
    const data = { hashedPassword: newHashedPassword };
    const result = await User.findOneAndUpdate(target, data);

    if (!result) {
      log.warn(
        `Can't find data from UserRepository: No email ${email.substring(0, 5)}`
      );
      return {
        success: false,
        statusCode: 404,
        error: "User to update password not found."
      };
    }

    log.info(`Updated password for user with email ${email.substring(0, 5)}`);
    return {
      success: true,
      statusCode: 200,
      data: { message: "Successfully updated password." }
    };
  }

  validateQuery(query: string) {
    return USERNAME_REGEX.test(query) || USER_ID_REGEX.test(query);
  }

  /**
   * TODO: User number field is now gone!!!
   */
  async createUser(userData: {
    [key: string]: unknown;
  }): Promise<RepositoryResponse> {
    const newUserData = {
      username: userData["username"],
      usernameInAllLowercase: userData["usernameInAllLowercase"],
      emailAddress: userData["emailAddress"],
      hashedPassword: userData["hashedPassword"],
      creationDateAndTime: Date.now(),
      statistics: {
        gamesPlayed: 0
      },
      membership: {
        isDeveloper: false,
        isAdministrator: false,
        isModerator: false,
        isContributor: false,
        isTester: false,
        isDonator: false,
        specialRank: ""
      }
    };

    try {
      const newUser = new User(newUserData);
      await newUser.save();
      log.info(`Created new user: ${userData["username"]}`);
      return {
        success: true,
        statusCode: 201
      };
    } catch (error) {
      log.error(`Failed to create user: ${userData["username"]}`);
      return {
        success: false,
        statusCode: 500,
        error: "Failed to create user."
      };
    }
  }
}
