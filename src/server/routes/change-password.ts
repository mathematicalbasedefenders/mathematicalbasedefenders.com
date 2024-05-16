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
import { addLogMessageMetadata, LogMessageLevel } from "../core/log";
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
    let query: any = url.parse(request.url, true).query;

    if (typeof query.email === "string" && typeof query.code === "string") {
      let email = DOMPurify.sanitize(
        mongoDBSanitize.sanitize(query.email) as unknown as string
      );
      let code = DOMPurify.sanitize(
        mongoDBSanitize.sanitize(query.code) as unknown as string
      );
      var pendingPasswordResetRecord = await PendingPasswordReset.findOne({
        emailAddress: email
      }).clone();

      if (pendingPasswordResetRecord) {
        if (
          pendingPasswordResetRecord["passwordResetConfirmationCode"] === code
        ) {
          // here
          let csrfToken = generateToken(response, request);
          response.render("pages/change-password-change", {
            csrfToken: csrfToken
          });
          return;
        } else {
          response.redirect("/?erroroccurred=true");
          return;
        }
      }
    } else if (
      typeof query.email === "string" ||
      typeof query.code === "string"
    ) {
      response.redirect("/?erroroccurred=true");
      return;
    }
    // here
    let csrfToken = generateToken(response, request);
    response.render("pages/change-password-entry", { csrfToken: csrfToken });
  }
);

router.post(
  "/request-password-change",
  [parseForm, doubleCsrfProtection, limiter],
  async (request: Request, response: Response) => {
    const responseKey = DOMPurify.sanitize(
      request.body["g-recaptcha-response"]
    );
    const reCaptchaSecretKey = DOMPurify.sanitize(
      process.env.RECAPTCHA_SECRET_KEY as string
    );
    const reCaptchaURL = DOMPurify.sanitize(
      `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
    );

    let desiredEmail = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body.email)
    );
    let passwordResetConfirmationCode = DOMPurify.sanitize(uuidv4());

    let playerData = await User.findOne({
      emailAddress: desiredEmail
    }).clone();

    if (playerData) {
      let fetchResponse = await fetch(reCaptchaURL, { method: "post" });
      let fetchResponseJSON: any = await fetchResponse.json();
      if (!fetchResponseJSON.success) {
        // bad - give error
        response.redirect("?erroroccurred=true&errorreason=captchanotcomplete");
        return;
      }

      let dataToSave = {
        emailAddress: desiredEmail,
        passwordResetConfirmationLink: `https://mathematicalbasedefenders.com/change-password?email=${desiredEmail}&code=${passwordResetConfirmationCode}`,
        passwordResetConfirmationCode: passwordResetConfirmationCode,
        expiresAt: new Date(Date.now() + 1800000).getTime()
      };
      let pendingPasswordResetToSave = new PendingPasswordReset(dataToSave);
      pendingPasswordResetToSave.save((error4) => {
        if (error4) {
          console.log(
            addLogMessageMetadata(error4.stack, LogMessageLevel.INFO)
          );
          response.redirect("/?resetpassword=fail");
        } else {
          if (
            !mail.sendMailForPasswordReset(
              desiredEmail,
              passwordResetConfirmationCode
            )
          ) {
            response.redirect("?erroroccurred=true");
          } else {
            response.redirect("/?sentpasswordresetlink=true");
          }
        }
      });
    } else {
      console.error(
        addLogMessageMetadata(
          `No user with e-mail address ${desiredEmail} found!`,
          LogMessageLevel.ERROR
        )
      );
      response.redirect("?erroroccurred=true");
    }
  }
);

router.post(
  "/change-password",
  [parseForm, doubleCsrfProtection, limiter],
  async (request: Request, response: Response) => {
    const responseKey = DOMPurify.sanitize(
      request.body["g-recaptcha-response"]
    );
    const reCaptchaSecretKey = DOMPurify.sanitize(
      process.env.RECAPTCHA_SECRET_KEY as string
    );
    const reCaptchaURL = DOMPurify.sanitize(
      `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
    );
    let fetchResponse = await fetch(reCaptchaURL, { method: "post" });
    let fetchResponseJSON: any = await fetchResponse.json();
    if (!fetchResponseJSON.success) {
      // give error
      response.redirect("?erroroccurred=true&errorreason=captchanotcomplete");
      return;
    }
    let query: any = request.query;
    let email = DOMPurify.sanitize(
      decodeURIComponent(
        mongoDBSanitize.sanitize(query.email)
      ) as unknown as string
    );
    let code = DOMPurify.sanitize(
      decodeURIComponent(
        mongoDBSanitize.sanitize(query.code)
      ) as unknown as string
    );
    let newPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body["new-password"])
    );
    let confirmNewPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body["confirm-new-password"])
    );

    let record = await PendingPasswordReset.findOne({
      $and: [{ emailAddress: email }, { passwordResetConfirmationCode: code }]
    }).clone();

    if (!record) {
      response.redirect("/?erroroccurred=true");
      return;
    }
    if (
      !(
        validation.validatePassword(newPassword) &&
        newPassword === confirmNewPassword
      )
    ) {
      response.redirect("/?erroroccurred=true");
    }

    try {
      let hashedNewPasswordSalt: string = await bcrypt.genSalt(14);
      let hashedNewPassword: string = await bcrypt.hash(
        newPassword,
        hashedNewPasswordSalt
      );
      await PendingPasswordReset.deleteOne({ emailAddress: email });
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
      console.log(
        addLogMessageMetadata(
          "Successfully changed password for a user!",
          LogMessageLevel.INFO
        )
      );
      response.redirect("/?changedpassword=true");
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(`Unknown password reset error: ${error}`);
      }
      response.redirect("/?erroroccurred=true");
    }
  }
);

export { router };
