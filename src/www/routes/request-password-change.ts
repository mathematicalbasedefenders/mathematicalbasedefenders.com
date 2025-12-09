import express, { NextFunction, Request, Response } from "express";
const router = express.Router();
import { apiBaseURL } from "../server";
import { log } from "../core/log";

import bodyParser from "body-parser";
const parseForm = bodyParser.urlencoded({ extended: false });

const processPasswordResetInformation = async (
  request: Request & { context?: { error: string } },
  response: Response,
  next: NextFunction
) => {
  try {
    const body = request.body;
    const requestPasswordResetResult = await fetch(
      `${apiBaseURL}/pending-password-resets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );
    const requestPasswordResetResultJSON =
      await requestPasswordResetResult.json();
    if (!requestPasswordResetResultJSON.success) {
      if (requestPasswordResetResultJSON.statusCode === 400) {
        request.context = {
          error: requestPasswordResetResultJSON.error
        };
        next();
        return;
      }

      if (requestPasswordResetResultJSON.statusCode === 403) {
        const error = new Error(
          "Unable to add request password reset (forbidden error)"
        );
        error.name = "ForbiddenError";
        throw error;
      }

      const error = new Error(
        "Unable to add request password reset (internal error)"
      );
      error.name = "InternalError";
      throw error;
    }

    response.render("pages/change-password-entry-complete");
  } catch (error) {
    next(error);
  }
};

const renderChangePasswordEntryPage = async (
  request: Request & { context?: { error: string } },
  response: Response,
  next: NextFunction
) => {
  try {
    const csrfTokenRequest = await fetch(`${apiBaseURL}/csrf`);
    const csrfTokenRequestJSON = await csrfTokenRequest.json();
    if (!csrfTokenRequestJSON.success) {
      const error = new Error(
        `Failed to get CSRF token for password reset entry page.`
      );
      error.name = "InternalError";
      throw error;
    }
    response.render("pages/change-password-entry", {
      csrfToken: csrfTokenRequestJSON.data?.csrfToken,
      errorMessage: request.context?.error,
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
    });
  } catch (error) {
    log.error(`Unable to get CSRF token for password reset entry page`);
    next(error);
    return;
  }
};

router.get("/request-password-change", renderChangePasswordEntryPage);

router.post(
  "/request-password-change",
  parseForm,
  processPasswordResetInformation,
  renderChangePasswordEntryPage
);

export { router, renderChangePasswordEntryPage };
