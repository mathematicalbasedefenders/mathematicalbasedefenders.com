type StandardModeLeaderboardsAPIResponse = {
  statistics: {
    score: number;
    timeInMilliseconds: number;
    scoreSubmissionDateAndTime: Date;
    actionsPerformed: number;
    enemiesKilled: number;
    enemiesCreated: number;
  };
  playerID: string;
  username: string;
};

export { StandardModeLeaderboardsAPIResponse };
