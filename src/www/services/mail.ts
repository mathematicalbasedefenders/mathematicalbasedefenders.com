import { log } from "../core/log.js";
import * as mail from "../core/mail.js";
import { PendingUser } from "../models/PendingUser.js";

async function sendMailToUnverifiedUser(
  desiredUsername: string,
  email: string,
  confirmationCode: string
) {
  if (!(await mail.sendMailToNewlyRegisteredUser(email, confirmationCode))) {
    log.error(
      `Unable to send verification message to ${desiredUsername}'s e-mail!`
    );

    await PendingUser.deleteOne({ emailAddress: email }).clone();
    log.info("Deleted pending user record (e-mail failed to send).");

    return {
      success: false,
      redirectTo: "?errorID=internalError"
    };
  }

  log.info(`Sent verification message to ${desiredUsername}'s e-mail address!`);
  log.info("New Unconfirmed User: " + desiredUsername);

  return {
    success: true,
    redirectTo: "/?registered=true"
  };
}

export { sendMailToUnverifiedUser };
