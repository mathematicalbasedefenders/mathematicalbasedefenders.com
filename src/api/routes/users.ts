import express from "express";
import UserRepository from "../repositories/UserRepository";
const router = express.Router();

router.get("/user/:query", async function (request, response) {
  const userRepository = new UserRepository();
  const data = await userRepository.getUserData(request.params.query);
  response.status(data.status).json(data);
  return;
});

export { router };
