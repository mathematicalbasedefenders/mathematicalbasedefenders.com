const mongoose = require("mongoose");

const PendingUser = new mongoose.Schema({
  username: String,
  usernameInAllLowercase: String,
  emailAddress: String,
  hashedPassword: String,
  emailConfirmationLink: String,
  emailConfirmationCode: String,
  expiresAt: {
    type: Date,
    default: new Date(Date.now() + 1800000).getTime(),
    expires: 1800
  }
});

PendingUser.index({ expiresAt: 1 }, { expireAfterSeconds: 1800 });

module.exports = mongoose.model(
  "PendingUserModel",
  PendingUser,
  "pendingUsers"
);
