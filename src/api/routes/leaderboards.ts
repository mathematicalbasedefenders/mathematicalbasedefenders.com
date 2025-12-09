import express from "express";
import LeaderboardsRepository from "../repositories/LeaderboardsRepository";
const router = express.Router();

router.get("/leaderboards/easy", async function (request, response, next) {
  try {
    const leaderboardsRepository = new LeaderboardsRepository();
    const data = await leaderboardsRepository.getEasySingleplayerLeaderboards();
    response.status(data.statusCode).json(data);
  } catch (error) {
    next(error);
  }
  return;
});

router.get("/leaderboards/standard", async function (request, response, next) {
  try {
    const leaderboardsRepository = new LeaderboardsRepository();
    const data =
      await leaderboardsRepository.getStandardSingleplayerLeaderboards();
    response.status(data.statusCode).json(data);
  } catch (error) {
    next(error);
  }
  return;
});

export { router };
