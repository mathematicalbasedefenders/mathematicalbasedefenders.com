import express from "express";
import UserRepository from "../repositories/UserRepository";
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

export { router };
