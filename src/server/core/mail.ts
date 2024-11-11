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
  let confirmationLink = `https://mathematicalbasedefenders.com/change-password`;
  confirmationLink += `?email=${email}`;
  confirmationLink += `&code=${code}`;
  const message = {
    subject: "Password Reset Confirmation for Mathematical Base Defenders",
    from: "Mathematical Base Defenders <noreply@mathematicalbasedefenders.com>",
    template: "password-reset",
    to: recipientEmail,
    context: {
      confirmationLink: confirmationLink
    }
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
  const confirmationBaseURL = `https://mathematicalbasedefenders.com/confirm-email-address`;
  const emailURL = `?email=${email}`;
  const codeURL = `&code=${code}`;
  const confirmationLink = confirmationBaseURL + emailURL + codeURL;
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

export { sendMailToNewlyRegisteredUser, sendMailForPasswordReset };
