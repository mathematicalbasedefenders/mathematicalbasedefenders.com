import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

function getMailContentForPasswordReset(
  recipientEmail: any,
  passwordResetConfirmationCode: any
) {
  let message = {
    from: "Mathematical Base Defenders Support <support@mathematicalbasedefenders.com>",
    to: recipientEmail,
    subject: "Password Reset Confirmation for Mathematical Base Defenders",
    html: `
<p>
Someone requested a password reset for your Mathematical Base Defenders account.
<br>
If this is you, and you want continue with the procedure, please click this link.
<br>
<a href=https://mathematicalbasedefenders.com/change-password?email=${encodeURIComponent(
      recipientEmail
    )}&code=${DOMPurify.sanitize(
      passwordResetConfirmationCode
    )}>https://mathematicalbasedefenders.com/change-password?email=${DOMPurify.sanitize(
      encodeURIComponent(recipientEmail)
    )}&code=${DOMPurify.sanitize(passwordResetConfirmationCode)}</a>
<br>
This link will expire in 30 minutes. After that, you may request a new password reset link. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
</p>
`
  };
  return message;
}

function getMailContentForNewlyRegisteredUser(
  recipientEmail: any,
  emailConfirmationCode: any
) {
  let message = {
    from: "Mathematical Base Defenders Support <support@mathematicalbasedefenders.com>",
    to: recipientEmail,
    subject: "Email Confirmation for Mathematical Base Defenders",
    html: `
                            <p>
                                Thanks for signing up for Mathematical Base Defenders!
                                <br>
                                In order to fully activate your account, please click the activation link below.
                                <br>
                                <a href=https://mathematicalbasedefenders.com/confirm-email-address?email=${DOMPurify.sanitize(
                                  encodeURIComponent(recipientEmail)
                                )}&code=${DOMPurify.sanitize(
      emailConfirmationCode
    )}>https://mathematicalbasedefenders.com/confirm-email-address?email=${DOMPurify.sanitize(
      encodeURIComponent(recipientEmail)
    )}&code=${DOMPurify.sanitize(emailConfirmationCode)}</a>
                                <br>
                                This link will expire in 30 minutes. After that, your account will be deleted and you may sign up again. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
                            </p>
                            `
  };
  return message;
}

function getNodemailerOptionsObject() {
  let toReturn = {
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: false, // for now, fix
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  };
  return toReturn;
}

export {
  getNodemailerOptionsObject,
  getMailContentForNewlyRegisteredUser,
  getMailContentForPasswordReset
};
