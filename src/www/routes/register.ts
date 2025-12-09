import express, { NextFunction, Request, Response } from "express";
var router = express.Router();
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
const parseForm = bodyParser.urlencoded({ extended: false });
const fetch = require("node-fetch");
import { log } from "../core/log";
import { apiBaseURL } from "../server";

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
      csrfToken: csrfTokenRequestJSON.data?.csrfToken,
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
