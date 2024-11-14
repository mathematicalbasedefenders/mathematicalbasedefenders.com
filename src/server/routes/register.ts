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
      errorMessage: errorMessage
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
    if (!checkCAPTCHA(request)) {
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
  const responseKey = request.body["g-recaptcha-response"];
  const reCaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
  // check url
  const reCaptchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`;
  // get response
  const fetchResponse = await fetch(reCaptchaURL, { method: "post" });
  const fetchResponseJSON: any = await fetchResponse.json();
  // return response
  return fetchResponseJSON.success;
}

export { router };
