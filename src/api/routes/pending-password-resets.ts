import express from "express";
import PendingPasswordResetRepository from "../repositories/PendingPasswordResetRepository";
const router = express.Router();

router.post(
  "/pending-password-resets",
  async function (request, response, next) {
    try {
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      const data =
        await pendingPasswordResetRepository.createPendingPasswordResetRecord(
          request.body
        );
      response.status(data.statusCode).json(data);
    } catch (error) {
      next(error);
    }
    return;
  }
);

router.get(
  "/pending-password-resets/:email/:code",
  async function (request, response, next) {
    try {
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      const data =
        await pendingPasswordResetRepository.checkPasswordResetRecordExistence(
          request.params.email,
          request.params.code
        );
      response.status(data.statusCode).json(data);
    } catch (error) {
      next(error);
    }
    return;
  }
);

export { router };
