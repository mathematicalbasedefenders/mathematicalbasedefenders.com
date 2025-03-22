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
const sha256 = require("js-sha256");

const ERROR_MESSAGES: { [key: string]: string } = {
  "captchaIncomplete": "Complete the CAPTCHA to request a password change!",
  "noUser": "User with the specified e-mail address doesn't exist!",
  "mailError": "Unable to send mail to your e-mail address!",
  "internalError":
    "An internal error has occurred! If this persists, please contact the administrator!",
  "none": ""
};

router.get(
  "/change-password",
  [limiter],
  async (request: Request, response: Response) => {
    const query: any = url.parse(request.url, true).query;

    if (typeof query.code === "string") {
      // sanitize email and code
      const email = mongoDBSanitize.sanitize(query.email) as unknown as string;
      const code = mongoDBSanitize.sanitize(query.code) as unknown as string;

      // find record
      const record = await getPendingPasswordResetRecord(code);

      // if no record, redirect to bad page
      if (!record) {
        log.warn(`No password reset record with code ${code} found`);
        response.redirect("/?erroroccurred=true");
        return;
      }

      // if valid record found, render actual change password page
      const csrfToken = generateToken(response, request);
      response.render("pages/change-password-change", {
        csrfToken: csrfToken,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
      });
      return;
    }

    // if nothing supplied, give entry page
    const csrfToken = generateToken(response, request);
    const errorMessage = ERROR_MESSAGES[request.query.errorID as string] || "";
    response.render("pages/change-password-entry", {
      csrfToken: csrfToken,
      errorMessage: errorMessage,
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
    });
  }
);

router.post(
  "/request-password-change",
  [parseForm, doubleCsrfProtection, limiter],
  async (request: Request, response: Response) => {
    // check for captcha completion
    if (!(await checkCAPTCHA(request.body["g-recaptcha-response"]))) {
      response.redirect("/change-password?errorID=captchaIncomplete");
      return;
    }

    // check if user actually exists
    const email = mongoDBSanitize.sanitize(request.body.email);
    const user = await User.findOne({ emailAddress: email }).clone();
    let ok = true;

    if (!user) {
      log.warn(
        `Request PW change: e-mail ${email.charAt(0)} (length ${
          email.length
        }) not found!`
      );
      // response.redirect("/change-password?errorID=noUser");
      ok = false;
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
      // response.redirect("/change-password?errorID=internalError");
      ok = false;
      return;
    }

    if (!mail.sendMailForPasswordReset(email, code)) {
      log.error(
        `Unable to send mail to ${email.charAt(0)} (length ${
          email.length
        }) for password request!`
      );
      await PendingPasswordReset.deleteOne({ emailAddress: email });
      // response.redirect("/change-password?errorID=mailError");
      ok = false;
      return;
    }

    if (ok) {
      log.info(
        `Successfully sent password reset e-mail to ${email.charAt(
          0
        )} (length ${email.length})`
      );
    }
    response.redirect("/?requested=true");
  }
);

router.post(
  "/change-password",
  [parseForm, doubleCsrfProtection, limiter],
  async (request: Request, response: Response) => {
    // check captcha
    if (!(await checkCAPTCHA(request.body["g-recaptcha-response"]))) {
      response.redirect("/?changed=false");
      return;
    }

    const code = getChangePasswordQueryString(request);

    const hashedCode = sha256(code);

    const record = await PendingPasswordReset.findOne({
      $and: [{ passwordResetConfirmationCode: hashedCode }]
    }).clone();
    if (!record) {
      log.warn(`Perform PW change: no code ${code} (record) found!`);
      response.redirect("/?changed=false");
      return;
    }

    const email = record.emailAddress;

    const newPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body["new-password"])
    );
    const confirmNewPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body["confirm-new-password"])
    );

    if (!validation.validatePassword(newPassword)) {
      log.warn(`New password doesn't fit validation criteria!`);
      response.redirect("/?changed=false");
      return;
    }

    if (!validation.validatePassword(confirmNewPassword)) {
      log.warn(`New password doesn't fit validation criteria!`);
      response.redirect("/?changed=false");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      log.warn(`New passwords don't match!`);
      response.redirect("/?changed=false");
      return;
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
      response.redirect("/?changed=true");
      await PendingPasswordReset.deleteOne({ emailAddress: email });
      log.info("Successfully deleted password reset record for said user!");
      return;
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(`Unknown password reset error: ${error}`);
      }
      response.redirect("/?changed=false");
      return;
    }
  }
);

// other functions
async function getPendingPasswordResetRecord(code: string) {
  const hashedCode = sha256(code);
  const pendingPasswordResetRecord = await PendingPasswordReset.findOne({
    $and: [{ passwordResetConfirmationCode: hashedCode }]
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
  const hashedPasswordResetConfirmationCode = sha256(code);
  const dataToSave = {
    emailAddress: email,
    passwordResetConfirmationLink: `https://mathematicalbasedefenders.com/change-password?email=${email}&code=${hashedPasswordResetConfirmationCode}`,
    passwordResetConfirmationCode: hashedPasswordResetConfirmationCode,
    expiresAt: new Date(Date.now() + 1800000).getTime()
  };
  return dataToSave;
}

function getChangePasswordQueryString(request: any) {
  function parseString(what: any) {
    const decoded = decodeURIComponent(what);
    const databaseSanitized = mongoDBSanitize.sanitize(decoded as any);
    const htmlSanitized = DOMPurify.sanitize(databaseSanitized);
    return htmlSanitized;
  }

  const query: any = request.query;
  const email = parseString(query.email);
  const code = parseString(query.code);
  return code;
}

export { router };
