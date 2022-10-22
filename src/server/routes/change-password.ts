import express from "express";
var router = express.Router();
import Metadata from "../models/Metadata";

import url from "url";
import csurf from "csurf";
const csrfProtection = csurf({ cookie: true });
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
import { addLogMessageMetadata, LogMessageLevel } from "../core/log";
import * as validation from "../core/validation";

import { User, UserInterface } from "../models/User";
import PendingPasswordReset from "../models/PendingPasswordReset";

router.get(
  "/change-password",
  [csrfProtection, limiter],
  async (request: any, response: any) => {
    response.cookie("csrfToken", request.csrfToken());
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
          pendingPasswordResetRecord["passwordResetConfirmationCode"] == code
        ) {
          response.render("pages/change-password");
        } else {
          response.redirect("/?erroroccurred=true");
        }
      }
    } else {
      response.redirect("/?erroroccurred=true");
    }
  }
);

router.post(
  "/change-password",
  parseForm,
  [csrfProtection, limiter],
  async (request: any, response: any) => {
    let query: any = url.parse(request.url, true).query;
    let email = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(query.email) as unknown as string
    );
    let code = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(query.code) as unknown as string
    );
    let newPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body.password)
    );
    let confirmNewPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body["confirm-password"])
    );

    let record = await PendingPasswordReset.find({
      $and: [{ emailAddress: email }, { code: code }]
    }).clone();

    if (record) {
      if (
        validation.validatePassword(newPassword) &&
        newPassword === confirmNewPassword
      ) {
        try {
          let hashedNewPasswordSalt: string = await bcrypt.genSalt(16);
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
          response.redirect("/?changedPassword=true");
        } catch (error: any) {
          console.error(
            addLogMessageMetadata(error.stack, LogMessageLevel.ERROR)
          );
          response.redirect("/?erroroccurred=true");
        }
      } else {
        response.redirect("/?erroroccurred=true");
      }
    } else {
      response.redirect("/?erroroccurred=true");
    }
  }
);

export { router };
