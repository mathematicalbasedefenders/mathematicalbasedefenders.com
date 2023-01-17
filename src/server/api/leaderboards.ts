import express from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
import { addLogMessageMetadata, LogMessageLevel } from "../core/log";
import {
  EasyModeLeaderboardsRecord,
  EasyModeLeaderboardsRecordInterface
} from "../models/EasyModeLeaderboardsRecord";
import {
  StandardModeLeaderboardsRecord,
  StandardModeLeaderboardsRecordInterface
} from "../models/StandardModeLeaderboardsRecord";

router.get("/api/leaderboards/:mode", limiter, async (request, response) => {
  let model;
  let data;
  switch (request.params.mode) {
    case "easy": {
      model = EasyModeLeaderboardsRecord;
      break;
    }
    case "standard": {
      model = StandardModeLeaderboardsRecord;
      break;
    }
    default: {
      response.status(404).json("Mode does not exist.");
      return;
    }
  }

  try {
    data = await model.getAll();
  } catch (error: any) {
    console.error(addLogMessageMetadata(error.stack, LogMessageLevel.ERROR));
    response.status(500).json("Internal Server Error.");
  }
  response.status(200).json(data);
});

export { router };
