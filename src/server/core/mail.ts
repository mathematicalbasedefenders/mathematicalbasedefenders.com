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

const handlebarOptions: NodemailerExpressHandlebarsOptions = {
  viewEngine: {
    partialsDir: path.join(__dirname, "mail-templates"),
    defaultLayout: false
  },
  viewPath: path.join(__dirname, "mail-templates")
};

const transporter = nodemailer.createTransport(getNodemailerOptionsObject());
transporter.use("compile", hbs(handlebarOptions));

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
    from: "Mathematical Base Defenders <support@mathematicalbasedefenders.com>",
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
  let confirmationLink = `https://mathematicalbasedefenders.com/confirm-email-address`;
  confirmationLink += `?email=${email}`;
  confirmationLink += `&code=${code}`;
  let message = {
    subject: "New Account Confirmation for Mathematical Base Defenders",
    from: "Mathematical Base Defenders <support@mathematicalbasedefenders.com>",
    template: "new-account",
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

export { sendMailToNewlyRegisteredUser, sendMailForPasswordReset };
