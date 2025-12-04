import express from "express";
import UserRepository from "../repositories/UserRepository";
import PendingUserRepository from "../repositories/PendingUserRepository";
import log from "../core/log";
import PendingPasswordResetRepository from "../repositories/PendingPasswordResetRepository";
const router = express.Router();

router.get("/users/:query", async function (request, response, next) {
  try {
    const userRepository = new UserRepository();
    const data = await userRepository.getUserData(request.params.query);
    response.status(data.statusCode).json(data);
  } catch (error) {
    next(error);
  }
  return;
});

// Verify new user
router.put("/users", async function (request, response, next) {
  try {
    const pendingUserRepository = new PendingUserRepository();
    const email = request.body.email;
    const confirmationCode = request.body.code;

    if (typeof email !== "string") {
      log.warn(`Request to verify user failed: Invalid e-mail type.`);
      response.status(400).json({
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      });
      return;
    }

    if (typeof confirmationCode !== "string") {
      log.warn(`Request to verify user failed: Invalid code type.`);
      response.status(400).json({
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      });
      return;
    }

    const decodedEmail = decodeURIComponent(email);
    const decodedCode = decodeURIComponent(confirmationCode);

    const data = await pendingUserRepository.verifyPendingUser(
      decodedEmail,
      decodedCode
    );
    response.status(data.statusCode).json(data);
  } catch (error) {
    next(error);
  }
  return;
});

// Process reset password reset
router.patch("/users", async function (request, response, next) {
  try {
    const pendingPasswordResetRepository = new PendingPasswordResetRepository();
    const email = request.body.email;
    const confirmationCode = request.body.code;
    const newPassword = request.body.newPassword;

    if (typeof email !== "string") {
      log.warn(`Request to verify user failed: Invalid e-mail type.`);
      response.status(400).json({
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      });
      return;
    }

    if (typeof confirmationCode !== "string") {
      log.warn(`Request to verify user failed: Invalid code type.`);
      response.status(400).json({
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      });
      return;
    }

    const decodedEmail = decodeURIComponent(email);
    const decodedCode = decodeURIComponent(confirmationCode);

    const data =
      await pendingPasswordResetRepository.verifyPendingPasswordReset(
        decodedEmail,
        decodedCode,
        newPassword
      );
    response.status(data.statusCode).json(data);
  } catch (error) {
    next(error);
  }
  return;
});

export { router };
