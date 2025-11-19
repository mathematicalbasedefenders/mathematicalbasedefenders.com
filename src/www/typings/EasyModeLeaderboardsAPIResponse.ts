type EasyModeLeaderboardsAPIResponse = {
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

export { EasyModeLeaderboardsAPIResponse };
