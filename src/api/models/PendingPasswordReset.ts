import mongoose from "mongoose";

interface PendingPasswordResetInterface {
  emailAddress: string;
  passwordResetConfirmationLink: string;
  passwordResetConfirmationCode: string;
  // expiresAt: {
  //   type: Date,
  //   default: new Date(Date.now() + 1800000).getTime(),
  //   expires: 1800
  // }
  expiresAt: {
    type: Date;
    default: Date;
    expires: number;
  };
}

interface PendingPasswordResetModel
  extends mongoose.Model<PendingPasswordResetInterface> {}

const PendingPasswordResetSchema = new mongoose.Schema<
  PendingPasswordResetInterface,
  PendingPasswordResetModel
>(
  {
    emailAddress: String,
    passwordResetConfirmationLink: String,
    passwordResetConfirmationCode: String,
    expiresAt: {
      type: Date,
      default: new Date(Date.now() + 1800000).getTime(),
      expires: 1800
    }
  },
  { collection: "pendingPasswordResets" }
);

PendingPasswordResetSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 1800 }
);

const PendingPasswordReset = mongoose.model<
  PendingPasswordResetInterface,
  PendingPasswordResetModel
>("PendingPasswordReset", PendingPasswordResetSchema, "pendingPasswordResets");

export { PendingPasswordReset };
