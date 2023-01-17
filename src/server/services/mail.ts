import * as log from "../core/log.js";
import * as mail from "../core/mail.js";
import nodemailer from "nodemailer";
async function sendMailToUnverifiedUser(
  desiredUsername: string,
  desiredEmail: string,
  emailConfirmationCode: string
) {
  let success: boolean = false;
  let transporter = nodemailer.createTransport(
    mail.getNodemailerOptionsObject()
  );
  let message = mail.getMailContentForNewlyRegisteredUser(
    desiredEmail,
    emailConfirmationCode
  );
  try {
    transporter.sendMail(message);
  } catch (error: any) {
    console.error(
      log.addLogMessageMetadata(error.stack, log.LogMessageLevel.ERROR)
    );
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
