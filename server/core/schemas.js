const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// const EasyModeLeaderboardsSchema = new Schema({
//     rankNumber: Number,
//     userIDOfHolder: String,
//     score: Number,
//     timeInMilliseconds: Number,
//     scoreSubmissionDateAndTime: Date,
//     enemiesKilled: Number,
//     enemiesCreated: Number,
//     actionsPerformed: Number
// });

// const EasyModeLeaderboardsModel = mongoose.model(
//     "EasyModeLeaderboardsModel",
//     EasyModeLeaderboardsSchema,
//     "easyModeLeaderboardsRecords"
// );

// const StandardModeLeaderboardsSchema = new Schema({
//     rankNumber: Number,
//     userIDOfHolder: String,
//     score: Number,
//     timeInMilliseconds: Number,
//     scoreSubmissionDateAndTime: Date,
//     enemiesKilled: Number,
//     enemiesCreated: Number,
//     actionsPerformed: Number
// });

// const StandardModeLeaderboardsModel = mongoose.model(
//     "StandardModeLeaderboardsModel",
//     StandardModeLeaderboardsSchema,
//     "standardModeLeaderboardsRecords"
// );

function getNewUserModelInstance() {
  return new UserModel();
}

function getNewUserModelInstanceWithData(data) {
  return new UserModel(data);
}

function getUserModel() {
  return UserModel;
}

function getEasyModeLeaderboardsModel() {
  return EasyModeLeaderboardsModel;
}

function getStandardModeLeaderboardsModel() {
  return StandardModeLeaderboardsModel;
}

module.exports = {
  getUserModel,
  getEasyModeLeaderboardsModel,
  getStandardModeLeaderboardsModel,
  getNewUserModelInstance,
  getNewUserModelInstanceWithData
};
