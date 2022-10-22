import express from "express";
var router = express.Router();

import PendingUser from "../models/PendingUser.js";
import { User, UserInterface } from "../models/User";
import Metadata from "../models/Metadata.js";

import csurf from "csurf";
const csrfProtection = csurf({ cookie: true });
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
const parseForm = bodyParser.urlencoded({ extended: false });
import nodemailer from "nodemailer";
import mongoDBSanitize from "express-mongo-sanitize";

import { JSDOM } from "jsdom";

import createDOMPurify from "dompurify";
const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
import { v4 as uuidv4 } from "uuid";

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
    let desiredUsernameInAllLowercase = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body.username)
    );
    desiredUsernameInAllLowercase = DOMPurify.sanitize(
      desiredUsernameInAllLowercase.toLowerCase()
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

        let errored = false;

        // get information
        let emailIsNotAvailable1 = await User.findOne({
          emailAddress: desiredEmail
        })
          .clone()
          .select(desiredEmail);
        let usernameIsNotAvailable1 = await User.findOne({
          usernameInAllLowercase: desiredUsernameInAllLowercase
        })
          .clone()
          .select(desiredUsernameInAllLowercase);
        let emailIsNotAvailable2 = await PendingUser.findOne({
          emailAddress: desiredEmail
        })
          .clone()
          .select(desiredEmail);
        let usernameIsNotAvailable2 = await PendingUser.findOne({
          usernameInAllLowercase: desiredUsernameInAllLowercase
        })
          .clone()
          .select(desiredUsernameInAllLowercase);

        if (usernameIsNotAvailable1 || usernameIsNotAvailable2) {
          // registration failed - username already taken
          response.redirect(
            "?erroroccurred=true&errorreason=usernamealreadytaken"
          );
          return;
        }

        if (
          !/^[0-9a-zA-Z_]+$/.test(desiredUsername) ||
          desiredUsername.length > 20 ||
          desiredUsername.length < 3 ||
          desiredUsername == "" ||
          desiredUsername == null
        ) {
          // registration failed - username not valid
          response.redirect("?erroroccurred=true&errorreason=usernamenotvalid");
          return;
        }

        if (emailIsNotAvailable1 || emailIsNotAvailable2) {
          // registration failed - email already taken
          response.redirect(
            "?erroroccurred=true&errorreason=emailalreadytaken"
          );
          return;
        }

        if (
          !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
            desiredEmail
          ) ||
          desiredEmail == "" ||
          desiredEmail == null
        ) {
          // registration failed - email not valid
          response.redirect("?erroroccurred=true&errorreason=emailnotvalid");
          return;
        }

        let plaintextPassword = DOMPurify.sanitize(
          mongoDBSanitize.sanitize(request.body.password)
        );

        if (
          plaintextPassword.length < 8 ||
          plaintextPassword.length > 64 ||
          plaintextPassword == "" ||
          plaintextPassword == null ||
          plaintextPassword.includes(" ") ||
          !/^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(plaintextPassword)
        ) {
          response.redirect("?erroroccurred=true&errorreason=passwordnotvalid");
          return;
        }

        let hashedPasswordToSave;
        let emailConfirmationCode;

        await bcrypt.genSalt(16, async (error1, salt) => {
          if (error1) {
            response.redirect("?erroroccurred=true&errorreason=internalerror");
            return;
          } else {
            await bcrypt.hash(plaintextPassword, salt, (error2, hash) => {
              if (error2) {
                response.redirect(
                  "?erroroccurred=true&errorreason=internalerror"
                );
                return;
              }
              hashedPasswordToSave = hash;
              emailConfirmationCode = uuidv4();

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

              pendingUserModelToSave.save((error4) => {
                if (error4) {
                  errored = true;
                  response.redirect(
                    "?erroroccurred=true&errorreason=internalerror"
                  );
                  return;
                }
              });

              if (errored) return;
              let transporter = nodemailer.createTransport(
                mail.getNodemailerOptionsObject()
              );
              let message = mail.getMailContentForNewlyRegisteredUser(
                desiredEmail,
                emailConfirmationCode
              );
              transporter.sendMail(message, (error, information) => {
                if (error) {
                  console.error(
                    addLogMessageMetadata(error.stack, LogMessageLevel.ERROR)
                  );
                  response.redirect(
                    "?erroroccurred=true&errorreason=internalerror"
                  );
                  return;
                } else {
                  console.log(
                    addLogMessageMetadata(
                      `Successfully sent verification message to ${desiredUsername}'s e-mail address!`,
                      LogMessageLevel.INFO
                    )
                  );
                  console.log(
                    addLogMessageMetadata(
                      "New Unconfirmed User: " + desiredUsername,
                      LogMessageLevel.INFO
                    )
                  );
                  response.redirect("/?registered=true");
                }
              });
            });
          }
        });
      });
  }
);

export { router };
