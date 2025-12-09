import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
import log from "../core/log.js";
import { sha256 } from "js-sha256";

const { SendMailClient } = require("zeptomail");

const EMAIL_URL = process.env.EMAIL_URL;
const EMAIL_TOKEN = process.env.EMAIL_TOKEN;
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME;

const client = new SendMailClient({ url: EMAIL_URL, token: EMAIL_TOKEN });

async function sendMailForPasswordReset(
  recipientEmail: string,
  confirmationCode: string
) {
  try {
    const email = DOMPurify.sanitize(recipientEmail);
    const code = DOMPurify.sanitize(confirmationCode);
    const toSend = {
      "from": {
        "address": EMAIL_FROM_ADDRESS,
        "name": EMAIL_FROM_NAME
      },
      "to": [
        {
          "email_address": {
            "address": email
          }
        }
      ],
      "subject": "Password Reset Confirmation for Mathematical Base Defenders",
      "textBody": generatePasswordChangeMail(email, code)
    };

    await client.sendMail(toSend);
  } catch (error) {
    if (error instanceof Error) {
      log.error(error.stack);
    } else {
      log.error(`Unknown mail error: ${JSON.stringify(error)}`);
    }
    return false;
  }
  return true;
}

async function sendMailToNewlyRegisteredUser(
  recipientEmail: string,
  confirmationCode: string
) {
  try {
    const email = DOMPurify.sanitize(recipientEmail);
    const code = DOMPurify.sanitize(confirmationCode);
    const toSend = {
      "from": {
        "address": EMAIL_FROM_ADDRESS,
        "name": EMAIL_FROM_NAME
      },
      "to": [
        {
          "email_address": {
            "address": email
          }
        }
      ],
      "subject": "New Account Confirmation for Mathematical Base Defenders",
      "textBody": generateNewUserMail(email, code)
    };

    await client.sendMail(toSend);
  } catch (error) {
    if (error instanceof Error) {
      log.error(error.stack);
    } else {
      log.error(`Unknown mail error: ${JSON.stringify(error)}`);
    }
    return false;
  }
  return true;
}

function generateNewUserMail(email: string, code: string) {
  const confirmationLink = constructConfirmationUrl(
    "confirm-email-address",
    sha256(email),
    code
  );
  const text = `
  Thank you for signing up to Mathematical Base Defenders!\n
  Your account is currently in a pending state, and can't be logged into.\n 
  In order to fully activate your account, and to be able to log in, please click on the activation link below.\n
  ${confirmationLink}\n
  This link will expire in 60 minutes. After that, your account will be deleted, but you may use the same e-mail address to sign up again.\n
  If you need any assistance, please e-mail support@mathematicalbasedefenders.com.\n
  `;
  return text;
}

function generatePasswordChangeMail(email: string, code: string) {
  const confirmationLink = constructConfirmationUrl(
    "change-password",
    sha256(email),
    code
  );
  const text = `
  A password reset for your Mathematical Base Defenders account has been requested.\n
  If you want to continue, please click this link.\n 
  ${confirmationLink}\n
  This link will expire in 60 minutes. After that, you may request a new password reset link.\n
  If you need any assistance, please e-mail support@mathematicalbasedefenders.com.\n
  `;
  return text;
}

function constructConfirmationUrl(base: string, email: string, code: string) {
  const encodedCode = encodeURI(code);
  let domain = "http://localhost:8000";
  if (!validateUrlParameters(base, email, code)) {
    log.warn("URL parameters is invalid, confirmation link not sent.");
    return `[CONFIRMATION LINK NOT SHOWN DUE TO ERROR, PLEASE CONTACT ADMINISTRATOR!]`;
  }
  if (process.env.CREDENTIAL_SET_USED === "production") {
    domain = "https://mathematicalbasedefenders.com";
  }

  // here because for some reason the `+`s in an emails are replaced with spaces.
  const encodedEmail = email.replaceAll("+", "%2B");
  return `${domain}/${base}?email=${encodedEmail}&code=${encodedCode}`;
}

function validateUrlParameters(base: string, email: string, code: string) {
  const validBase = ["confirm-email-address", "change-password"];
  const baseIsValid = validBase.includes(base);
  return base && email && code && baseIsValid;
}

export { sendMailToNewlyRegisteredUser, sendMailForPasswordReset };
