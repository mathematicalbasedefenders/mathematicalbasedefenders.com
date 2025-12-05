import express from "express";
import UserRepository from "../repositories/UserRepository";
import PendingUserRepository from "../repositories/PendingUserRepository";
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
router.post("/users", async function (request, response, next) {
  try {
    const pendingUserRepository = new PendingUserRepository();
    const email = request.body.email;
    const confirmationCode = request.body.code;

    const data = await pendingUserRepository.verifyPendingUser(
      email,
      confirmationCode
    );
    response.status(data.statusCode).json(data);
  } catch (error) {
    next(error);
  }
  return;
});

// Process reset password reset
router.patch(
  "/users/:userID/password",
  async function (request, response, next) {
    try {
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();

      const userID = request.params.userID;
      const email = request.body.email;
      const confirmationCode = request.body.code;
      const newPassword = request.body.newPassword;
      const confirmNewPassword = request.body.confirmNewPassword;

      const data =
        await pendingPasswordResetRepository.verifyPendingPasswordReset(
          userID,
          email,
          confirmationCode,
          newPassword,
          confirmNewPassword
        );
      response.status(data.statusCode).json(data);
    } catch (error) {
      next(error);
    }
    return;
  }
);

export { router };
