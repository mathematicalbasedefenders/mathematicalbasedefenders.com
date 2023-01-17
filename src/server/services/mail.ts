const log = require("../core/log.js");
const mail = require("../core/mail.js");
const nodemailer = require("nodemailer");
function sendMailToUnverifiedUser(desiredUsername: string, desiredEmail: string, emailConfirmationCode: string){
  let transporter = nodemailer.createTransport(
    mail.getNodemailerOptionsObject()
  );
  let message = mail.getMailContentForNewlyRegisteredUser(desiredEmail, emailConfirmationCode);
  transporter.sendMail(message, (error: any, information: any) => {
    if (error || !information) {
      console.error(log.addMetadata(error.stack, "error"));
      return {
        success: false,
        redirectTo: "?erroroccurred=true&errorreason=internalerror"
      };
    } else {
      console.log(
        log.addMetadata(
          `Successfully sent verification message to ${desiredUsername}'s e-mail address!`,
          "info"
        )
      );
      console.log(
        log.addMetadata(
          "New Unconfirmed User: " + desiredUsername,
          "info"
        )
      );
        return {
          success: true,
          redirectTo: "/?registered-true"
        }
    }
  });
}

export{
  sendMailToUnverifiedUser,
}