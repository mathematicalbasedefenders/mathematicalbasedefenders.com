import express from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
import { log } from "../core/log";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

import { User, UserInterface } from "../models/User";

router.get("/api/metadata", limiter, async (request, response) => {
  let data = Object.create(null);
  data.usersRegistered = await User.countDocuments(
    {},
    function (error: Error, count: number) {
      if (error) {
        log.error(error.stack);
      }
    }
  ).clone();
  response.status(200).json(data);
});

export { router };
