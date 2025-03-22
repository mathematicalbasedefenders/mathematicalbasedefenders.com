import express, { Request, Response } from "express";
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
const UserService = require("../../server/services/user.js");
const MailService = require("../../server/services/mail.js");
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

router.get(
  "/register",
  limiter,
  async (request: Request, response: Response) => {
    const csrfToken = generateToken(response, request);
    const errorMessage = ERROR_MESSAGES[request.query.errorID as string];
    response.render("pages/register", {
      csrfToken: csrfToken,
      errorMessage: errorMessage,
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
    });
  }
);

router.post(
  "/register",
  [parseForm, doubleCsrfProtection, limiter],
  async (request: Request, response: Response) => {
    // process registration
    // is response good?

    // check captcha
    if (!(await checkCAPTCHA(request))) {
      response.redirect("?errorID=captchaIncomplete");
      return;
    }

    const [username, email, password] = getUserDetails(request);
    const validationResult = await UserService.validateNewUser(
      username,
      email,
      password
    );

    if (!validationResult.success) {
      // TODO: Redo URLs
      response.redirect(validationResult.redirectTo);
      return;
    }
    // Add User
    let addUserResult = await UserService.addUnverifiedUser(
      username,
      email,
      password
    );
    if (!addUserResult.success) {
      response.redirect(addUserResult.redirectTo);
      return;
    }
    // Send Mail

    await MailService.sendMailToUnverifiedUser(
      username,
      email,
      addUserResult.emailConfirmationCode
    );

    // Finish
    response.redirect("/?registered=true");
  }
);

function getUserDetails(request: Request) {
  let desiredUsername = DOMPurify.sanitize(
    mongoDBSanitize.sanitize(request.body.username)
  );
  let desiredEmail = DOMPurify.sanitize(
    mongoDBSanitize.sanitize(request.body.email)
  );
  let plaintextPassword = DOMPurify.sanitize(
    mongoDBSanitize.sanitize(request.body.password)
  );
  return [desiredUsername, desiredEmail, plaintextPassword];
}

async function checkCAPTCHA(request: Request) {
  // get keys
  try {
    const responseKey = request.body["g-recaptcha-response"];
    const reCaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY ?? "";
    // check url
    const reCaptchaURL = "https://www.google.com/recaptcha/api/siteverify";
    const parameters = new URLSearchParams();
    parameters.append("secret", reCaptchaSecretKey);
    parameters.append("response", responseKey);
    // get response
    const fetchResponse = await fetch(reCaptchaURL, {
      method: "post",
      body: parameters
    });
    const fetchResponseJSON: any = await fetchResponse.json();
    // return response
    return fetchResponseJSON.success;
  } catch (error) {
    // this is mostly caused by external network resources
    // e.g. reCAPTCHA servers are down
    log.error("Error WHILE verifying CAPTCHA:");
    log.error(error);
    return false;
  }
}

export { router };
