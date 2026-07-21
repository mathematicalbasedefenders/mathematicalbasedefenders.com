import * as chai from "chai";
chai.should();

import { User } from "../../../src/api/models/User";
import LeaderboardsRepository from "../../../src/api/repositories/LeaderboardsRepository";
import { getMockUserUsername } from "../../mock-data-generator";

type LeaderboardEntry = {
  username: string;
  rank: number;
  statistics: {
    score: number;
  };
};

async function setPersonalBest(
  username: string,
  mode: "Easy" | "Standard",
  score: number,
  submissionDate: Date
) {
  await User.updateOne(
    { usernameInAllLowercase: username.toLowerCase() },
    {
      $set: {
        [`statistics.personalBestScoreOn${mode}SingleplayerMode`]: {
          score,
          timeInMilliseconds: 1000,
          scoreSubmissionDateAndTime: submissionDate,
          actionsPerformed: 10,
          enemiesKilled: 5,
          enemiesCreated: 5
        }
      }
    }
  );
}

describe("LeaderboardsRepository", function () {
  describe(".getEasySingleplayerLeaderboards()", function () {
    it("should return an empty successful leaderboard when no scores exist", async function () {
      const leaderboardsRepository = new LeaderboardsRepository();
      const result =
        await leaderboardsRepository.getEasySingleplayerLeaderboards();

      result.success.should.equal(true);
      result.statusCode.should.equal(200);
      (result.data as Array<object>).should.deep.equal([]);
    });

    it("should sort scores, break ties by oldest submission, and assign ranks", async function () {
      await setPersonalBest(
        getMockUserUsername(1),
        "Easy",
        100,
        new Date("2025-01-03T00:00:00.000Z")
      );
      await setPersonalBest(
        getMockUserUsername(2),
        "Easy",
        200,
        new Date("2025-01-02T00:00:00.000Z")
      );
      await setPersonalBest(
        getMockUserUsername(3),
        "Easy",
        200,
        new Date("2025-01-01T00:00:00.000Z")
      );

      const leaderboardsRepository = new LeaderboardsRepository();
      const result =
        await leaderboardsRepository.getEasySingleplayerLeaderboards();
      const data = result.data as LeaderboardEntry[];

      result.success.should.equal(true);
      data.map((entry) => entry.username).should.deep.equal([
        getMockUserUsername(3),
        getMockUserUsername(2),
        getMockUserUsername(1)
      ]);
      data.map((entry) => entry.rank).should.deep.equal([1, 2, 3]);
      data.map((entry) => entry.statistics.score).should.deep.equal([
        200, 200, 100
      ]);
    });

    it("should return status code 500 if scores cannot be loaded", async function () {
      const originalMethod = User.getEasySingleplayerBestScores;
      User.getEasySingleplayerBestScores = async () => {
        throw new Error("database unavailable");
      };

      try {
        const leaderboardsRepository = new LeaderboardsRepository();
        const result =
          await leaderboardsRepository.getEasySingleplayerLeaderboards();

        result.success.should.equal(false);
        result.statusCode.should.equal(500);
        result.error?.should.equal("Internal Server Error.");
      } finally {
        User.getEasySingleplayerBestScores = originalMethod;
      }
    });
  });

  describe(".getStandardSingleplayerLeaderboards()", function () {
    it("should include only standard-mode scores and rank them independently", async function () {
      await setPersonalBest(
        getMockUserUsername(1),
        "Easy",
        999,
        new Date("2025-01-01T00:00:00.000Z")
      );
      await setPersonalBest(
        getMockUserUsername(2),
        "Standard",
        50,
        new Date("2025-01-02T00:00:00.000Z")
      );
      await setPersonalBest(
        getMockUserUsername(3),
        "Standard",
        75,
        new Date("2025-01-03T00:00:00.000Z")
      );

      const leaderboardsRepository = new LeaderboardsRepository();
      const result =
        await leaderboardsRepository.getStandardSingleplayerLeaderboards();
      const data = result.data as LeaderboardEntry[];

      result.success.should.equal(true);
      result.statusCode.should.equal(200);
      data.map((entry) => entry.username).should.deep.equal([
        getMockUserUsername(3),
        getMockUserUsername(2)
      ]);
      data.map((entry) => entry.rank).should.deep.equal([1, 2]);
    });

    it("should return status code 500 if scores cannot be loaded", async function () {
      const originalMethod = User.getStandardSingleplayerBestScores;
      User.getStandardSingleplayerBestScores = async () => {
        throw new Error("database unavailable");
      };

      try {
        const leaderboardsRepository = new LeaderboardsRepository();
        const result =
          await leaderboardsRepository.getStandardSingleplayerLeaderboards();

        result.success.should.equal(false);
        result.statusCode.should.equal(500);
        result.error?.should.equal("Internal Server Error.");
      } finally {
        User.getStandardSingleplayerBestScores = originalMethod;
      }
    });
  });
});
