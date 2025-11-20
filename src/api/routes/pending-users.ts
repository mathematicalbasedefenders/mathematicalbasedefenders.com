import express from "express";
import PendingUserRepository from "../repositories/PendingUserRepository";
const router = express.Router();

router.post("/pending-users", async function (request, response, next) {
  try {
    const pendingUserRepository = new PendingUserRepository();
    const data = await pendingUserRepository.createPendingUser(request.body);
    response.status(data.status).json(data);
  } catch (error) {
    next(error);
  }
  return;
});

export { router };
