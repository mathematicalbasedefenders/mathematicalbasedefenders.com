import express, { Request, Response } from "express";
var router = express.Router();
import { v4 as uuidv4 } from "uuid";
import url from "url";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
const parseForm = bodyParser.urlencoded({ extended: false });
import mongoDBSanitize from "express-mongo-sanitize";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
const fetch = require("node-fetch");
import { log } from "../core/log";
import * as validation from "../core/validation";
import * as mail from "../core/mail.js";
import { User } from "../models/User";
import PendingPasswordReset from "../models/PendingPasswordReset";
import { doubleCsrf } from "csrf-csrf";
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => "Secret",
  cookieName: "x-csrf-token",
  getTokenFromRequest: function (req) {
    return req.body["csrf-token"];
  }
});
router.get(
  "/change-password",
  [limiter],
  async (request: Request, response: Response) => {
    const query: any = url.parse(request.url, true).query;

    // if invalid query, redirect to bad page.
    if (typeof query.email === "string" || typeof query.code === "string") {
      response.redirect("/?erroroccurred=true");
      return;
    }

    if (typeof query.email === "string" && typeof query.code === "string") {
      // sanitize email and code
      const email = mongoDBSanitize.sanitize(query.email) as unknown as string;
      const code = mongoDBSanitize.sanitize(query.code) as unknown as string;

      // find record
      const record = await getPendingPasswordResetRecord(email, code);

      // if no record, redirect to bad page
      if (record) {
        response.redirect("/?erroroccurred=true");
        return;
      }

      // if valid record found, render actual change password page
      const csrfToken = generateToken(response, request);
      response.render("pages/change-password-change", {
        csrfToken: csrfToken
      });
      return;
    }

    // if nothing supplied, give entry page
    const csrfToken = generateToken(response, request);
    response.render("pages/change-password-entry", { csrfToken: csrfToken });
  }
);

router.post(
  "/request-password-change",
  [parseForm, doubleCsrfProtection, limiter],
  async (request: Request, response: Response) => {
    // check for captcha completion
    if (!checkCAPTCHA(request.body["g-recaptcha-response"])) {
      response.send("no good - captcha");
      return;
    }

    // check if user actually exists
    const email = mongoDBSanitize.sanitize(request.body.email);
    const user = await User.findOne({ emailAddress: email }).clone();

    if (!user) {
      log.error(`Request PW change: e-mail address ${email} found!`);
      response.send("no good - no user");
      return;
    }

    // create record
    const code = uuidv4();
    const record = createPasswordResetRequestRecord(email, code);
    const pendingPasswordResetToSave = new PendingPasswordReset(record);

    // save record
    try {
      await pendingPasswordResetToSave.save();
    } catch (error: any) {
      log.error("Internal error while resetting password:");
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(error);
      }
      response.send("no good - internal error");
      return;
    }

    if (!mail.sendMailForPasswordReset(email, code)) {
      log.error(`Unable to send mail to ${email} for password request/`);
      response.send("no good - email error");
      return;
    }

    log.error(`Successfully sent password reset e-mail to ${email}`);
    response.redirect("/?sentpasswordresetlink=true");
  }
);

router.post(
  "/change-password",
  [parseForm, doubleCsrfProtection, limiter],
  async (request: Request, response: Response) => {
    //   const responseKey = DOMPurify.sanitize(
    //     request.body["g-recaptcha-response"]
    //   );
    //   const reCaptchaSecretKey = DOMPurify.sanitize(
    //     process.env.RECAPTCHA_SECRET_KEY as string
    //   );
    //   const reCaptchaURL = DOMPurify.sanitize(
    //     `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
    //   );
    //   let fetchResponse = await fetch(reCaptchaURL, { method: "post" });
    //   let fetchResponseJSON: any = await fetchResponse.json();
    //   if (!fetchResponseJSON.success) {
    //     // give error
    //     response.redirect("?erroroccurred=true&errorreason=captchanotcomplete");
    //     return;
    //   }

    // check captcha
    if (!checkCAPTCHA(request.body["g-recaptcha-response"])) {
      response.send("no good - captcha");
      return;
    }

    //   let query: any = request.query;
    //   let email = DOMPurify.sanitize(
    //     decodeURIComponent(
    //       mongoDBSanitize.sanitize(query.email)
    //     ) as unknown as string
    //   );
    //   let code = DOMPurify.sanitize(
    //     decodeURIComponent(
    //       mongoDBSanitize.sanitize(query.code)
    //     ) as unknown as string
    //   );

    const [email, code] = getChangePasswordQueryString(request);

    const record = await PendingPasswordReset.findOne({
      $and: [{ emailAddress: email }, { passwordResetConfirmationCode: code }]
    }).clone();
    if (!record) {
      log.error(`Perform PW change: no e-mail  ${email} (record) found!`);
      response.send("no good - no record");
      return;
    }
    //   if (
    //     !(
    //       validation.validatePassword(newPassword) &&
    //       newPassword === confirmNewPassword
    //     )
    //   ) {
    //     response.redirect("/?erroroccurred=true");
    //   }

    const newPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body["new-password"])
    );
    const confirmNewPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body["confirm-new-password"])
    );

    if (!validation.validatePassword(newPassword)) {
      response.send("no good - password doesn't match");
    }

    if (!validation.validatePassword(confirmNewPassword)) {
      response.send("no good - confirm password doesn't match");
    }

    if (newPassword !== confirmNewPassword) {
      response.send("no good - new & confirm password doesn't match");
    }

    try {
      const hashedNewPasswordSalt: string = await bcrypt.genSalt(14);
      const hashedNewPassword: string = await bcrypt.hash(
        newPassword,
        hashedNewPasswordSalt
      );
      await User.findOneAndUpdate(
        { emailAddress: email },
        {
          hashedPassword: hashedNewPassword
        },
        {
          useFindAndModify: true,
          new: true
        }
      ).clone();
      log.info("Successfully changed password for a user!");
      response.redirect("/?changedpassword=true");
      await PendingPasswordReset.deleteOne({ emailAddress: email });
      log.info("Successfully deleted password reset record for said user!");
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(`Unknown password reset error: ${error}`);
      }
      response.send("no good - server side error");
    }
  }
);

// other functions
async function getPendingPasswordResetRecord(email: any, code: any) {
  const pendingPasswordResetRecord = await PendingPasswordReset.findOne({
    $and: [{ emailAddress: email }, { code: code }]
  }).clone();
  return pendingPasswordResetRecord;
}

async function checkCAPTCHA(responseKey: string) {
  const reCaptchaSecretKey = DOMPurify.sanitize(
    process.env.RECAPTCHA_SECRET_KEY as string
  );
  const reCaptchaURL = DOMPurify.sanitize(
    `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
  );

  const fetchResponse = await fetch(reCaptchaURL, { method: "post" });
  const fetchResponseJSON = await fetchResponse.json();
  return fetchResponseJSON.success;
}

function createPasswordResetRequestRecord(email: string, code: string) {
  // create password reset request record
  const passwordResetConfirmationCode = code;
  const dataToSave = {
    emailAddress: email,
    passwordResetConfirmationLink: `https://mathematicalbasedefenders.com/change-password?email=${email}&code=${passwordResetConfirmationCode}`,
    passwordResetConfirmationCode: passwordResetConfirmationCode,
    expiresAt: new Date(Date.now() + 1800000).getTime()
  };
  return dataToSave;
}

function getChangePasswordQueryString(request: any) {
  function parseString(what: any) {
    const databaseSanitized = mongoDBSanitize.sanitize(what);
    const decoded = decodeURIComponent(databaseSanitized) as unknown as string;
    const htmlSanitized = DOMPurify.sanitize(decoded);
    return htmlSanitized;
  }

  const query: any = request.query;
  const email = parseString(query.email);
  const code = parseString(query.code);
  return [email, code];
}

function applyPasswordChange() {}

export { router };
