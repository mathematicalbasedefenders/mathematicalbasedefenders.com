const mongoose = require("mongoose")

const UserModelSchema = new mongoose.Schema({
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

UserModelSchema.statics.safeFindByUsername = function (username) {
    return this.findOne({ username: username }).select({
        emailAddress: 0,
        hashedPassword: 0
    });
};

module.exports = mongoose.model("User", UserModelSchema, "users");