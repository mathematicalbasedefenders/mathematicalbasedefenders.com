import mongoose, { SchemaTypes } from "mongoose";

interface UserInterface {
  _id: string;
  username: string;
  usernameInAllLowercase: string;
  emailAddress: string;
  hashedPassword: string;
  userNumber: number;
  creationDateAndTime: Date;
  statistics: {
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
      replayID: mongoose.Types.ObjectId;
    };
    personalBestScoreOnStandardSingleplayerMode: {
      score: number;
      timeInMilliseconds: number;
      scoreSubmissionDateAndTime: Date;
      actionsPerformed: number;
      enemiesKilled: number;
      enemiesCreated: number;
      globalRank: number;
      replayID: mongoose.Types.ObjectId;
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
  verboseFindByUsername(username: string): Promise<UserInterface>;
  verboseFindByUserID(userID: string): Promise<UserInterface>;
  findByUsername(username: string): Promise<UserInterface>;
  findByUserID(userID: string): Promise<UserInterface>;
  findByEmail(email: string): Promise<UserInterface>;
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
    gamesPlayed: Number,
    totalExperiencePoints: Number,
    personalBestScoreOnEasySingleplayerMode: {
      score: Number,
      timeInMilliseconds: Number,
      scoreSubmissionDateAndTime: Date,
      actionsPerformed: Number,
      enemiesKilled: Number,
      enemiesCreated: Number,
      globalRank: Number,
      replayID: SchemaTypes.ObjectId
    },
    personalBestScoreOnStandardSingleplayerMode: {
      score: Number,
      timeInMilliseconds: Number,
      scoreSubmissionDateAndTime: Date,
      actionsPerformed: Number,
      enemiesKilled: Number,
      enemiesCreated: Number,
      globalRank: Number,
      replayID: SchemaTypes.ObjectId
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

UserSchema.static("verboseFindByUsername", async function (username: string) {
  return this.findOne({ usernameInAllLowercase: username.toLowerCase() })
    .select({
      emailAddress: 0,
      hashedPassword: 0
    })
    .clone();
});

UserSchema.static("verboseFindByUserID", async function (userID: string) {
  return this.findOne({ _id: userID })
    .select({
      emailAddress: 0,
      hashedPassword: 0
    })
    .clone();
});

UserSchema.static("findByUsername", async function (username: string) {
  return this.findOne({ usernameInAllLowercase: username.toLowerCase() })
    .select({
      username: 1,
      creationDateAndTime: 1,
      statistics: 1,
      membership: 1
    })
    .clone();
});

UserSchema.static("findByUserID", async function (userID: string) {
  return this.findOne({ _id: userID })
    .select({
      username: 1,
      creationDateAndTime: 1,
      statistics: 1,
      membership: 1
    })
    .clone();
});

/**
 * This should not be exposed to the end user.
 * This should only be used for internal purposes.
 */
UserSchema.static("findByEmail", async function (email: string) {
  return this.findOne({ emailAddress: email })
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
    const loaded: Array<object> = [];
    const cursor = this.find({
      "statistics.personalBestScoreOnEasySingleplayerMode": { $ne: null }
    })
      .select({
        _id: 1,
        "username": 1,
        "membership": 1,
        "statistics.personalBestScoreOnEasySingleplayerMode": 1
      })
      .limit(limit)
      .sort([
        ["statistics.personalBestScoreOnEasySingleplayerMode.score", -1],
        [
          "statistics.personalBestScoreOnEasySingleplayerMode.scoreSubmissionDateAndTime",
          1
        ]
      ])
      .clone()
      .lean(true)
      .cursor();
    for await (const player of cursor) {
      const formattedPlayer = {
        _id: player._id,
        username: player.username,
        membership: player.membership,
        statistics: player.statistics.personalBestScoreOnEasySingleplayerMode
      };
      loaded.push(formattedPlayer);
    }
    return loaded;
  }
);

UserSchema.static(
  "getStandardSingleplayerBestScores",
  async function (limit: number) {
    const loaded: Array<object> = [];
    const cursor = this.find({
      "statistics.personalBestScoreOnStandardSingleplayerMode": { $ne: null }
    })
      .select({
        _id: 1,
        "username": 1,
        "membership": 1,
        "statistics.personalBestScoreOnStandardSingleplayerMode": 1
      })
      .limit(limit)
      .sort([
        ["statistics.personalBestScoreOnStandardSingleplayerMode.score", -1],
        [
          "statistics.personalBestScoreOnStandardSingleplayerMode.scoreSubmissionDateAndTime",
          1
        ]
      ])
      .clone()
      .lean(true)
      .cursor();
    for await (const player of cursor) {
      const formattedPlayer = {
        _id: player._id,
        username: player.username,
        membership: player.membership,
        statistics:
          player.statistics.personalBestScoreOnStandardSingleplayerMode
      };
      loaded.push(formattedPlayer);
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
