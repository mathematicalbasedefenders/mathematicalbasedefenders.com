import log from "../core/log";
import { User } from "../models/User";

import RepositoryResponse from "../types/RepositoryResponse";

export default class LeaderboardsRepository {
  async getEasySingleplayerLeaderboards(): Promise<RepositoryResponse> {
    const amount = 100;
    const data = await User.getEasySingleplayerBestScores(amount);

    log.info(`Returned Easy Mode data from LeaderboardsRepository.`);
    return {
      success: true,
      status: 200,
      data: data
    };
  }

  async getStandardSingleplayerLeaderboards(): Promise<RepositoryResponse> {
    const amount = 100;
    const data = await User.getStandardSingleplayerBestScores(amount);

    log.info(`Returned Standard Mode data from LeaderboardsRepository.`);
    return {
      success: true,
      status: 200,
      data: data
    };
  }
}
