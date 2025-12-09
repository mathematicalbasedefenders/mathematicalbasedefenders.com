import log from "../core/log";
import { User } from "../models/User";

import RepositoryResponse from "../types/RepositoryResponse";

export default class LeaderboardsRepository {
  async getEasySingleplayerLeaderboards(): Promise<RepositoryResponse> {
    try {
      const amount = 100;
      const data = await User.getEasySingleplayerBestScores(amount);

      log.info(`Returned Easy Mode data from LeaderboardsRepository.`);
      return {
        success: true,
        statusCode: 200,
        data: data
      };
    } catch (error) {
      log.error(`Error fetching Easy Mode leaderboards: ${error}`);
      return {
        success: false,
        statusCode: 500,
        error: "Internal Server Error."
      };
    }
  }

  async getStandardSingleplayerLeaderboards(): Promise<RepositoryResponse> {
    try {
      const amount = 100;
      const data = await User.getStandardSingleplayerBestScores(amount);

      log.info(`Returned Standard Mode data from LeaderboardsRepository.`);
      return {
        success: true,
        statusCode: 200,
        data: data
      };
    } catch (error) {
      log.error(`Error fetching Standard Mode leaderboards: ${error}`);
      return {
        success: false,
        statusCode: 500,
        error: "Internal Server Error."
      };
    }
  }
}
