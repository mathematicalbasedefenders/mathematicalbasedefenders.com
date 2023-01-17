import express from "express";
var router = express.Router();

import { PendingUser } from "../models/PendingUser.js";
import { User, UserInterface } from "../models/User";
import Metadata from "../models/Metadata.js";

import csurf from "csurf";
const csrfProtection = csurf({ cookie: true });
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
const parseForm = bodyParser.urlencoded({ extended: false });
import nodemailer from "nodemailer";
import mongoDBSanitize from "express-mongo-sanitize";
const UserService = require("../../server/services/user.js");
const MailService = require("../../server/services/mail.js");
import { JSDOM } from "jsdom";

import createDOMPurify from "dompurify";
const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
import { v4 as uuidv4 } from "uuid";
import fetch from "isomorphic-fetch";
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

import { addLogMessageMetadata, LogMessageLevel } from "../core/log.js";
import * as mail from "../core/mail";

router.get(
  "/register",
  [csrfProtection, limiter],
  (request: any, response: any) => {
    response.cookie("csrfToken", request.csrfToken());
    response.render("pages/register");
  }
);

router.post(
  "/register",
  parseForm,
  [csrfProtection, limiter],
  async (request: any, response: any) => {
    const responseKey = DOMPurify.sanitize(
      request.body["g-recaptcha-response"]
    );
    const reCaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

    const reCaptchaURL = DOMPurify.sanitize(
      `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
    );

    let desiredUsername = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body.username)
    );
    let desiredEmail = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body.email)
    );
    let plaintextPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body.password)
    );
    fetch(reCaptchaURL, { method: "post" })
      .then((response) => response.json())
      .then(async (google_response) => {
        if (!google_response.success) {
          // registration failed - captcha not completed
          response.redirect(
            "?erroroccurred=true&errorreason=captchanotcomplete"
          );
          return;
        }

        let validationResult = await UserService.validateNewUserInformation(
          desiredUsername,
          desiredEmail,
          plaintextPassword
        );

        if (!validationResult.success) {
          response.redirect(validationResult.redirectTo);
          return;
        }

        let dataWriteResult = await UserService.addUnverifiedUser(
          desiredUsername,
          desiredEmail,
          plaintextPassword
        );

        if (!dataWriteResult.success) {
          response.redirect(dataWriteResult.redirectTo);
          return;
        }

        let mailResult = await MailService.sendMailToUnverifiedUser(
          desiredUsername,
          desiredEmail,
          dataWriteResult.emailConfirmationCode
        );

        if (!mailResult.success) {
          response.redirect(mailResult.redirectTo);
          return;
        }

        try {
          let salt = await bcrypt.genSalt(16);

          let hashedPasswordToSave = await bcrypt.hash(plaintextPassword, salt);

          let emailConfirmationCode = uuidv4();

          let desiredUsernameInAllLowercase: string =
            desiredUsername.toLowerCase();

          // create data object (pending user)
          let dataToSave = {
            username: desiredUsername,
            usernameInAllLowercase: desiredUsernameInAllLowercase,
            emailAddress: desiredEmail,
            hashedPassword: hashedPasswordToSave,
            emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}`,
            emailConfirmationCode: emailConfirmationCode,
            expiresAt: new Date(Date.now() + 1800000).getTime()
          };

          let pendingUserModelToSave = new PendingUser(dataToSave);

          pendingUserModelToSave.save();

          let transporter = nodemailer.createTransport(
            mail.getNodemailerOptionsObject()
          );
          let message = mail.getMailContentForNewlyRegisteredUser(
            desiredEmail,
            emailConfirmationCode
          );
          transporter.sendMail(message);
        } catch (error: any) {
          console.error(
            addLogMessageMetadata(error.stack, LogMessageLevel.ERROR)
          );
          response.redirect("/?erroroccurred=true&errorreason=internalerror");
          return;
        }
      });
    response.redirect("/?registered=true");
  }
);

export { router };
