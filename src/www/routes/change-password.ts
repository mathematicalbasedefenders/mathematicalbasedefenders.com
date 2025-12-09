import express, { NextFunction, Request, Response } from "express";
const router = express.Router();
import bodyParser from "body-parser";
const parseForm = bodyParser.urlencoded({ extended: false });

const fetch = require("node-fetch");
import { log } from "../core/log";
import { apiBaseURL } from "../server";

const renderChangePasswordPage = async (
  request: Request & { context?: { error: string } },
  response: Response,
  next: NextFunction
) => {
  try {
    const csrfTokenRequest = await fetch(`${apiBaseURL}/csrf`);
    const csrfTokenRequestJSON = await csrfTokenRequest.json();
    if (!csrfTokenRequestJSON.success) {
      const error = new Error(
        `Failed to get CSRF token for password reset page.`
      );
      error.name = "InternalError";
      throw error;
    }

    const email = request.query?.email;
    const code = request.query?.code;

    if (typeof email !== "string") {
      log.warn(`Unable to verify for user password reset page. (bad email)`);
      response.status(400).render("pages/change-password-error");
      return;
    }

    if (typeof code !== "string") {
      log.warn(`Unable to verify for user password reset page. (bad code)`);
      response.status(400).render("pages/change-password-error");
      return;
    }

    const existenceCheckResult = await fetch(
      `${apiBaseURL}/pending-password-resets/${email}/${code}`
    );

    const existenceCheckResultJSON = await existenceCheckResult.json();

    if (!existenceCheckResultJSON.success) {
      if (existenceCheckResultJSON.statusCode === 400) {
        log.warn(`Unable to verify for password reset page. (bad request)`);
        response.status(400).render("pages/change-password-error");
        return;
      }

      if (existenceCheckResultJSON.statusCode === 403) {
        const error = new Error(
          "Unable to verify for password reset page. (forbidden error)"
        );
        error.name = "ForbiddenError";
        throw error;
      }

      const error = new Error(
        "Unable to verify user for password reset page. (internal error)"
      );
      error.name = "InternalError";
      throw error;
    }

    response.render("pages/change-password-change", {
      csrfToken: csrfTokenRequestJSON.data?.csrfToken,
      errorMessage: request.context?.error,
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
      userID: existenceCheckResultJSON.data.userID
    });
  } catch (error) {
    log.error(`Internal error while rendering password reset page`);
    next(error);
    return;
  }
};

const processPasswordChange = async (
  request: Request & { context?: { error: string } },
  response: Response,
  next: NextFunction
) => {
  try {
    // this one is custom made for this route due to query strings
    // having to be used as body data. that's why it looks ugly
    // -mistertfy64 2025-12-05
    const body = {
      email: request.query.email?.toString() ?? "",
      code: request.query.code?.toString() ?? "",
      userID: request.body["user-id"],
      newPassword: request.body["new-password"] ?? "",
      confirmNewPassword: request.body["confirm-new-password"] ?? "",
      "csrf-token": request.body["csrf-token"]
    };

    const passwordChangeResult = await fetch(
      `${apiBaseURL}/users/${request.body["user-id"]}/password`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const passwordChangeResultJSON = await passwordChangeResult.json();
    if (!passwordChangeResultJSON.success) {
      if (passwordChangeResultJSON.statusCode === 400) {
        request.context = {
          error: passwordChangeResultJSON.error
        };
        next();
        return;
      }

      if (passwordChangeResultJSON.statusCode === 403) {
        const error = new Error(
          "Unable to change password for change password page (forbidden error)"
        );
        error.name = "ForbiddenError";
        throw error;
      }

      const error = new Error(
        "Unable to change password for change password page (internal error)"
      );
      error.name = "InternalError";
      throw error;
    }

    response.render("pages/change-password-change-complete");
    return;
  } catch (error) {
    next(error);
  }
};

router.get("/change-password", renderChangePasswordPage);

router.post(
  "/change-password",
  parseForm,
  processPasswordChange,
  renderChangePasswordPage
);

export { router };
