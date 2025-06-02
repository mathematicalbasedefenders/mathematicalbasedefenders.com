import mongoose from "mongoose";

interface UserInterface {
  _id: string;
  username: string;
  usernameInAllLowercase: string;
  emailAddress: string;
  hashedPassword: string;
  userNumber: number;
  creationDateAndTime: Date;
  statistics: {
    easyModePersonalBestScore: number;
    standardModePersonalBestScore: number;
    gamesPlayed: number;
    totalExperiencePoints: number;
    personalBestScoreOnEasySingleplayerMode: {
      score: number;
      timeInMilliseconds: number;
      scoreSubmissionDateAndTime: Date;
      actionsPerformed: number;
      enemiesKilled: number;
      enemiesCreated: number;
      globalRank: number;
    };
    personalBestScoreOnStandardSingleplayerMode: {
      score: number;
      timeInMilliseconds: number;
      scoreSubmissionDateAndTime: Date;
      actionsPerformed: number;
      enemiesKilled: number;
      enemiesCreated: number;
      globalRank: number;
    };
    multiplayer: {
      gamesPlayed: number;
      gamesWon: number;
    };
  };
  membership: {
    isDeveloper: boolean;
    isAdministrator: boolean;
    isModerator: boolean;
    isContributor: boolean;
    isTester: boolean;
    isDonator: boolean;
    specialRank: string;
  };
}

interface UserModel extends mongoose.Model<UserInterface> {
  safeFindByUsername(username: string): Promise<UserInterface>;
  safeFindByUserID(userID: string): Promise<UserInterface>;
  findByUsernameUsingAPI(username: string): Promise<UserInterface>;
  findByUserIDUsingAPI(userID: string): Promise<UserInterface>;
  getEasySingleplayerBestScores(limit: number): Promise<Array<UserInterface>>;
  getStandardSingleplayerBestScores(
    limit: number
  ): Promise<Array<UserInterface>>;
}

const UserSchema = new mongoose.Schema<UserInterface, UserModel>({
  username: String,
  usernameInAllLowercase: String,
  emailAddress: String,
  hashedPassword: String,
  userNumber: Number,
  creationDateAndTime: Date,
  statistics: {
    easyModePersonalBestScore: Number,
    standardModePersonalBestScore: Number,
    gamesPlayed: Number,
    totalExperiencePoints: Number,
    personalBestScoreOnEasySingleplayerMode: {
      score: Number,
      timeInMilliseconds: Number,
      scoreSubmissionDateAndTime: Date,
      actionsPerformed: Number,
      enemiesKilled: Number,
      enemiesCreated: Number,
      globalRank: Number
    },
    personalBestScoreOnStandardSingleplayerMode: {
      score: Number,
      timeInMilliseconds: Number,
      scoreSubmissionDateAndTime: Date,
      actionsPerformed: Number,
      enemiesKilled: Number,
      enemiesCreated: Number,
      globalRank: Number
    },
    multiplayer: {
      gamesPlayed: Number,
      gamesWon: Number
    }
  },
  membership: {
    isDeveloper: Boolean,
    isAdministrator: Boolean,
    isModerator: Boolean,
    isContributor: Boolean,
    isTester: Boolean,
    isDonator: Boolean,
    specialRank: String
  }
});

UserSchema.static("safeFindByUsername", async function (username: string) {
  return this.findOne({ username: username })
    .select({
      emailAddress: 0,
      hashedPassword: 0
    })
    .clone();
});

UserSchema.static("safeFindByUserID", async function (userID: string) {
  return this.findOne({ _id: userID })
    .select({
      emailAddress: 0,
      hashedPassword: 0
    })
    .clone();
});

UserSchema.static("findByUsernameUsingAPI", async function (username: string) {
  return this.findOne({ usernameInAllLowercase: username.toLowerCase() })
    .select({
      username: 1,
      creationDateAndTime: 1,
      statistics: 1,
      membership: 1
    })
    .clone();
});

UserSchema.static("findByUserIDUsingAPI", async function (userID: string) {
  return this.findOne({ _id: userID })
    .select({
      username: 1,
      creationDateAndTime: 1,
      statistics: 1,
      membership: 1
    })
    .clone();
});

UserSchema.static(
  "getEasySingleplayerBestScores",
  async function (limit: number) {
    let players: Array<object> = [];
    let loaded: Array<object> = [];
    let cursor = this.find({})
      .select({
        _id: 1,
        "username": 1,
        "membership": 1,
        "statistics.personalBestScoreOnEasySingleplayerMode": 1
      })
      .limit(limit)
      .clone()
      .lean(true)
      .cursor();
    for await (let player of cursor) {
      loaded.push(player);
    }
    return loaded;
  }
);

UserSchema.static(
  "getStandardSingleplayerBestScores",
  async function (limit: number) {
    let players: Array<object> = [];
    let loaded: Array<object> = [];
    let cursor = this.find({})
      .select({
        _id: 1,
        "username": 1,
        "membership": 1,
        "statistics.personalBestScoreOnStandardSingleplayerMode": 1
      })
      .limit(limit)
      .clone()
      .lean(true)
      .cursor();
    for await (let player of cursor) {
      loaded.push(player);
    }
    return loaded;
  }
);

const User = mongoose.model<UserInterface, UserModel>(
  "User",
  UserSchema,
  "users"
);

export { User, UserInterface };
