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
//
router.get("/register", limiter, (request, response) => {
  let csrfToken = generateToken(response, request);
  response.render("pages/register", { csrfToken: csrfToken });
});

router.post(
  "/register",
  [parseForm, doubleCsrfProtection, limiter],
  async (request: Request, response: Response) => {
    // process registration
    // is response good?
    const responseKey = DOMPurify.sanitize(
      request.body["g-recaptcha-response"]
    );
    const reCaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    const reCaptchaURL = DOMPurify.sanitize(
      `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
    );
    // Captcha
    let fetchResponse = await fetch(reCaptchaURL, { method: "post" });
    let fetchResponseJSON: any = await fetchResponse.json();
    if (!fetchResponseJSON.success) {
      // bad - give error
      response.redirect("?erroroccurred=true&errorreason=captchanotcomplete");
      return;
    }
    // Info Validation

    let username, email, password;
    [username, email, password] = getUserDetails(request);
    let validationResult = await UserService.validateNewUser(
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

export { router };
