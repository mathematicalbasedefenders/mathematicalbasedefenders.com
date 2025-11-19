#!/usr/bin/env nodejs
import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import mongoDBSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import path from "path";

require("@dotenvx/dotenvx").config({
  path: path.join(__dirname, "../credentials/.env")
});

const cors = require("cors");
const corsOptions = {
  origin: ["https://mathematicalbasedefenders.com", "http://localhost:8000"],
  credentials: true
};

import log from "./api/core/log";
const PORT = 9000;
const DATABASE_URI: string | undefined = process.env.DATABASE_CONNECTION_URI;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15 * 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: function (request, response) {
    log.warn(`Rate limited IP ${request.ip}`);
    response
      .status(429)
      .json({ success: false, error: "You are being rate limited." });
    return;
  }
});

const app = express();
app.set("trust proxy", 2);
app.use(express.urlencoded({ extended: true }));
app.use(mongoDBSanitize());
app.use(limiter);
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives()
      }
    }
  })
);
app.use(cookieParser());

// mongoose
if (!DATABASE_URI) {
  log.error("DATABASE_CONNECTION_URI environment variable is not set");
  throw new Error("DATABASE_CONNECTION_URI environment variable is not set");
}
if (typeof DATABASE_URI === "string") {
  mongoose.connect(DATABASE_URI);
}
mongoose.connection.on("connected", () => {
  log.info("Connected to mongoose.");
});

// Routes
require("fs")
  .readdirSync(path.join(__dirname, "./api/routes"))
  .forEach((file: string) => {
    app.use(require(path.join(__dirname, "./api/routes", file)).router);
  });

// PUT THIS LAST (404)
app.get("*", function (request: Request, response: Response) {
  response.status(404).json({ success: false, error: "Not Found." });
});

// stuff that needs to be at the end
app.use(
  (error: Error, request: Request, response: Response, next: NextFunction) => {
    log.error(error.stack);
    response.status(500).json({
      success: false,
      error:
        "Internal Server Error. (Contact the server administrator if this persists.)"
    });
  }
);

app.listen(PORT, () => {
  log.info(`App listening at http://localhost:${PORT}`);
  if (process.env.CREDENTIAL_SET_USED === "testing") {
    log.warn(`Using testing credentials.`);
  }
});
