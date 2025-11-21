import log from "../core/log";
import { User, UserInterface } from "../models/User";
import RepositoryResponse from "../types/RepositoryResponse";

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
    const data = isUserID
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

  validateQuery(query: string) {
    return USERNAME_REGEX.test(query) || USER_ID_REGEX.test(query);
  }
}
