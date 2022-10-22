import mongoose from "mongoose";

interface UserInterface {
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
    };
    personalBestScoreOnStandardSingleplayerMode: {
      score: number;
      timeInMilliseconds: number;
      scoreSubmissionDateAndTime: Date;
      actionsPerformed: number;
      enemiesKilled: number;
      enemiesCreated: number;
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
  safeFindByUsername(username: string): Promise<Object>;
  safeFindByUserID(userID: string): Promise<Object>;
  findByUsernameUsingAPI(username: string): Promise<Object>;
  findByUserIDUsingAPI(userID: string): Promise<Object>;
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
      enemiesCreated: Number
    },
    personalBestScoreOnStandardSingleplayerMode: {
      score: Number,
      timeInMilliseconds: Number,
      scoreSubmissionDateAndTime: Date,
      actionsPerformed: Number,
      enemiesKilled: Number,
      enemiesCreated: Number
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
  return this.findOne({ username: username })
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

const User = mongoose.model<UserInterface, UserModel>("User", UserSchema);

export { User, UserInterface };
