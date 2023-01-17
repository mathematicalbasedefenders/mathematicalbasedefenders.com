import { User, UserInterface } from "../models/User";

import express from "express";
var router = express.Router();
import { addLogMessageMetadata, LogMessageLevel } from "../core/log.js";

import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/statistics", limiter, (request, response) => {
  User.countDocuments({}, function (error: any, count: number) {
    if (error) {
      console.error(addLogMessageMetadata(error.stack, LogMessageLevel.ERROR));
    }
    response.render("pages/statistics", {
      statistics: { registeredUsers: count }
    });
  });
});

export { router };
