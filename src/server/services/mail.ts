import * as log from "../core/log.js";
import * as mail from "../core/mail.js";

async function sendMailToUnverifiedUser(
  desiredUsername: string,
  email: string,
  confirmationCode: string
) {
  if (!mail.sendMailToNewlyRegisteredUser(email, confirmationCode)) {
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=internalerror"
    };
  }
  console.log(
    log.addLogMessageMetadata(
      `Successfully sent verification message to ${desiredUsername}'s e-mail address!`,
      log.LogMessageLevel.INFO
    )
  );
  console.log(
    log.addLogMessageMetadata(
      "New Unconfirmed User: " + desiredUsername,
      log.LogMessageLevel.INFO
    )
  );

  return {
    success: true,
    redirectTo: "/?registered-true"
  };
}

export { sendMailToUnverifiedUser };
