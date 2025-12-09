import express from "express";
const router = express.Router();

import { apiBaseURL } from "../server.js";
import { log } from "../core/log.js";

router.get(
  "/confirm-email-address",

  async (request, response, next) => {
    try {
      const email = request.query?.email;
      const code = request.query?.code;

      if (typeof email !== "string") {
        log.warn(`Unable to verify for user verification page. (bad email)`);
        response.status(400).render("pages/confirm-email-address-error");
        return;
      }

      if (typeof code !== "string") {
        log.warn(`Unable to verify for user verification page. (bad code)`);
        response.status(400).render("pages/confirm-email-address-error");
        return;
      }

      const body = {
        email: encodeURIComponent(email),
        code: encodeURIComponent(code)
      };

      const verifyUserResult = await fetch(`${apiBaseURL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const verifyUserResultJSON = await verifyUserResult.json();
      if (!verifyUserResultJSON.success) {
        if (verifyUserResultJSON.statusCode === 400) {
          log.warn(
            `Unable to verify for user verification page. (bad request)`
          );
          response.status(400).render("pages/confirm-email-address-error");
          return;
        }

        if (verifyUserResultJSON.statusCode === 403) {
          const error = new Error(
            "Unable to verify for user verification page. (forbidden error)"
          );
          error.name = "ForbiddenError";
          throw error;
        }

        const error = new Error(
          "Unable to verify user for user verification page. (internal error)"
        );
        error.name = "InternalError";
        throw error;
      }

      response.render("pages/confirm-email-address-complete");
    } catch (error) {
      next(error);
    }
  }
);

export { router };
