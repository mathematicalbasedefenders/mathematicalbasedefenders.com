import { log } from "../core/log.js";
import * as mail from "../core/mail.js";

async function sendMailToUnverifiedUser(
  desiredUsername: string,
  email: string,
  confirmationCode: string
) {
  if (!mail.sendMailToNewlyRegisteredUser(email, confirmationCode)) {
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
