import mongoose from "mongoose";

interface PendingUserInterface {
  username: string;
  usernameInAllLowercase: string;
  emailAddress: string;
  hashedPassword: string;
  emailConfirmationLink: string;
  emailConfirmationCode: string;
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

interface PendingUserModel extends mongoose.Model<PendingUserInterface> {}

const PendingUserSchema = new mongoose.Schema<
  PendingUserInterface,
  PendingUserModel
>({
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

PendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 1800 });

PendingUserSchema.static(
  "findUserAndCode",
  async function (email: string, confirmationCode: string) {
    // could be none, if none exists.
    let user = await this.find({
      $and: [
        { emailAddress: email },
        { emailConfirmationCode: confirmationCode }
      ]
    });
    return user;
  }
);

const PendingUser = mongoose.model<PendingUserInterface, PendingUserModel>(
  "PendingUser",
  PendingUserSchema
);

export default PendingUser;
