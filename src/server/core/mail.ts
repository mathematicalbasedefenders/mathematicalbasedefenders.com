import path from "path";
import hbs, {
  NodemailerExpressHandlebarsOptions
} from "nodemailer-express-handlebars";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
import nodemailer from "nodemailer";
import { log } from "../core/log.js";

const transporter = nodemailer.createTransport(getNodemailerOptionsObject());

async function sendMailForPasswordReset(
  recipientEmail: string,
  confirmationCode: string
) {
  const email = DOMPurify.sanitize(encodeURIComponent(recipientEmail));
  const code = DOMPurify.sanitize(confirmationCode);

  const message = {
    subject: "Password Reset Confirmation for Mathematical Base Defenders",
    from: "Mathematical Base Defenders <noreply@mathematicalbasedefenders.com>",
    text: generatePasswordChangeMail(email, code),
    to: recipientEmail
  };
  try {
    await transporter.sendMail(message);
  } catch (error) {
    if (error instanceof Error) {
      log.error(error.stack);
    } else {
      log.error(`Unknown mail error: ${error}`);
    }
    return false;
  }
  return true;
}

async function sendMailToNewlyRegisteredUser(
  recipientEmail: string,
  confirmationCode: string
) {
  const email = DOMPurify.sanitize(encodeURIComponent(recipientEmail));
  const code = DOMPurify.sanitize(confirmationCode);
  const message = {
    subject: "New Account Confirmation for Mathematical Base Defenders",
    from: "Mathematical Base Defenders <noreply@mathematicalbasedefenders.com>",
    text: generateNewUserMail(email, code),
    to: recipientEmail
  };

  try {
    await transporter.sendMail(message);
  } catch (error) {
    if (error instanceof Error) {
      log.error(error.stack);
    } else {
      log.error(`Unknown mail error: ${error}`);
    }
    return false;
  }
  return true;
}

function getNodemailerOptionsObject() {
  let toReturn = {
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  };
  return toReturn;
}

function generateNewUserMail(email: string, code: string) {
  const confirmationLink = constructConfirmationUrl(
    "confirm-email-address",
    email,
    code
  );
  const text = `
  Thank you for signing up to Mathematical Base Defenders!\n
  Your account is currently in a pending state, and can't be logged into.\n 
  In order to fully activate your account, and to be able to log in, please click on the activation link below.\n
  ${confirmationLink}\n
  This link will expire in 30 minutes. After that, your account will be deleted, but you may use the same e-mail address to sign up again.\n
  If you need any assistance, please e-mail support@mathematicalbasedefenders.com.\n
  `;
  return text;
}

function generatePasswordChangeMail(email: string, code: string) {
  const confirmationLink = constructConfirmationUrl(
    "change-password",
    email,
    code
  );
  const text = `
  A password reset for your Mathematical Base Defenders account has been requested.\n
  If you want to continue, please click this link.\n 
  ${confirmationLink}\n
  This link will expire in 30 minutes. After that, you may request a new password reset link.\n
  If you need any assistance, please e-mail support@mathematicalbasedefenders.com.\n
  `;
  return text;
}

function validateUrlParameters(base: string, email: string, code: string) {
  const validBase = ["confirm-email-address", "change-password"];
  const baseIsValid = validBase.includes(base);
  return base && email && code && baseIsValid;
}

function constructConfirmationUrl(base: string, email: string, code: string) {
  if (!validateUrlParameters(base, email, code)) {
    log.warn("URL parameters is invalid, confirmation link not sent.");
    return `[CONFIRMATION LINK NOT SHOWN DUE TO ERROR, PLEASE CONTACT ADMINISTRATOR!]`;
  }
  return `https://mathematicalbasedefenders.com/${base}?email=${email}&code=${code}`;
}

export { sendMailToNewlyRegisteredUser, sendMailForPasswordReset };
