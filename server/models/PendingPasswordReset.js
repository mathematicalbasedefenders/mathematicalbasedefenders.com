const mongoose = require("mongoose");

const PendingPasswordResetSchema = new mongoose.Schema({
  emailAddress: String,
  passwordResetConfirmationLink: String,
  passwordResetConfirmationCode: String,
  expiresAt: {
    type: Date,
    default: new Date(Date.now() + 1800000).getTime(),
    expires: 1800
  }
});

module.exports = mongoose.model(
  "PendingPasswordResetModel",
  PendingPasswordResetSchema,
  "pendingPasswordResets"
);
