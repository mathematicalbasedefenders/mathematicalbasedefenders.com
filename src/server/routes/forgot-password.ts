import express from "express";
var router = express.Router();
import Metadata from "../models/Metadata.js";
import { User, UserInterface } from "../models/User";
import PendingPasswordReset from "../models/PendingPasswordReset.js";

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
import * as mail from "../core/mail.js";

router.get(
  "/forgot-password",
  [csrfProtection, limiter],
  async (request: any, response: any) => {
    response.cookie("csrfToken", request.csrfToken());
    response.render("pages/forgot-password");
  }
);

router.post(
  "/forgot-password",
  parseForm,
  [csrfProtection, limiter],
  async (request: any, response: any) => {
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
      fetch(reCaptchaURL, { method: "post" })
        .then((response) => response.json())
        .then((google_response) => {
          if (google_response.success == true) {
            let dataToSave = {
              emailAddress: desiredEmail,
              passwordResetConfirmationLink: `https://mathematicalbasedefenders.com/change-password?email=${desiredEmail}&code=${passwordResetConfirmationCode}`,
              passwordResetConfirmationCode: passwordResetConfirmationCode,
              expiresAt: new Date(Date.now() + 1800000).getTime()
            };
            let pendingPasswordResetToSave = new PendingPasswordReset(
              dataToSave
            );
            pendingPasswordResetToSave.save((error4) => {
              if (error4) {
                console.log(
                  addLogMessageMetadata(error4.stack, LogMessageLevel.INFO)
                );
                response.redirect("/?resetpassword=fail");
              } else {
                let transporter = nodemailer.createTransport(
                  mail.getNodemailerOptionsObject()
                );
                let message = mail.getMailContentForPasswordReset(
                  desiredEmail,
                  passwordResetConfirmationCode
                );

                transporter.sendMail(message, (error, information) => {
                  if (error) {
                    console.error(
                      addLogMessageMetadata(error.stack, LogMessageLevel.ERROR)
                    );
                    response.redirect("?erroroccurred=true");
                  } else {
                    response.redirect("/?sentpasswordresetlink=true");
                  }
                });
              }
            });
          } else {
            response.redirect("?resetpassword=fail");
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

export { router };
