import express, { NextFunction, Request, Response } from "express";
var router = express.Router();
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { doubleCsrf } from "csrf-csrf";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
const UserService = require("../../www/services/user.js");
const MailService = require("../../www/services/mail.js");
const parseForm = bodyParser.urlencoded({ extended: false });
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => "Secret",
  cookieName: "x-csrf-token",
  getTokenFromRequest: function (req) {
    return req.body["csrf-token"];
  }
});
import mongoDBSanitize from "express-mongo-sanitize";
const fetch = require("node-fetch");
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { log } from "../core/log";
import { apiBaseURL } from "../../server";
import path from "path";

const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const ERROR_MESSAGES: { [key: string]: string } = {
  "captchaIncomplete": "Complete the CAPTCHA to register!",
  "usernameUnavailable": "Username is already taken!",
  "usernameInvalid": "Username is invalid!",
  "emailUnavailable": "E-mail is already taken!",
  "emailInvalid": "E-mail is invalid!",
  "passwordInvalid": "Password is invalid!",
  "internalError":
    "An internal error has occurred! If this persists, please contact the administrator!",
  "none": ""
};

const renderRegisterPage = async (
  request: Request & { context?: { error: string } },
  response: Response,
  next: NextFunction
) => {
  try {
    const csrfTokenRequest = await fetch(`${apiBaseURL}/csrf`);
    const csrfTokenRequestJSON = await csrfTokenRequest.json();
    if (!csrfTokenRequestJSON.success) {
      const error = new Error(`Failed to get CSRF token for register page.`);
      error.name = "InternalError";
      throw error;
    }
    response.render("pages/register", {
      csrfToken: csrfTokenRequestJSON.csrfToken,
      errorMessage: request.context?.error,
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
    });
  } catch (error) {
    log.error(`Unable to get CSRF token for register page`);
    next(error);
    return;
  }
};

const processRegistrationInformation = async (
  request: Request & { context?: { error: string } },
  response: Response,
  next: NextFunction
) => {
  // process registration
  // is response good?

  // // check captcha
  // if (!(await checkCAPTCHA(request))) {
  //   response.redirect("?errorID=captchaIncomplete");
  //   return;
  // }

  // const [username, email, password] = getUserDetails(request);
  // const validationResult = await UserService.validateNewUser(
  //   username,
  //   email,
  //   password
  // );

  // if (!validationResult.success) {
  //   // TODO: Redo URLs
  //   response.redirect(validationResult.redirectTo);
  //   return;
  // }
  // // Add User
  // let addUserResult = await UserService.addUnverifiedUser(
  //   username,
  //   email,
  //   password
  // );
  // if (!addUserResult.success) {
  //   response.redirect(addUserResult.redirectTo);
  //   return;
  // }
  // // Send Mail

  // const mailResult = await MailService.sendMailToUnverifiedUser(
  //   username,
  //   email,
  //   addUserResult.emailConfirmationCode
  // );
  // if (!mailResult.success) {
  //   response.redirect(mailResult.redirectTo);
  //   return;
  // }

  // Finish

  try {
    const body = request.body;
    const addUserResult = await fetch(`${apiBaseURL}/pending-users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const addUserResultJSON = await addUserResult.json();
    if (!addUserResultJSON.success) {
      if (addUserResultJSON.statusCode === 400) {
        request.context = {
          error: addUserResultJSON.error
        };
        next();
        return;
      }

      if (addUserResultJSON.statusCode === 403) {
        const error = new Error(
          "Unable to add user for register page (forbidden error)"
        );
        error.name = "ForbiddenError";
        throw error;
      }

      const error = new Error(
        "Unable to add user for register page (internal error)"
      );
      error.name = "InternalError";
      throw error;
    }

    response.render("pages/registration-complete");
  } catch (error) {
    next(error);
  }
};

router.get("/register", limiter, renderRegisterPage);

router.post(
  "/register",
  [parseForm, limiter],
  processRegistrationInformation,
  renderRegisterPage
);

export { router };
