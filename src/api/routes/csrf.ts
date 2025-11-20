import express from "express";
import log from "../core/log";
const router = express.Router();

router.get("/csrf", async function (request, response, next) {
  try {
    response.json({ csrfToken: request.csrfToken() });
  } catch (error) {
    log.error(`Error while generating CSRF token.`);
    next(error);
  }
});

export { router };
