#!/usr/bin/env nodejs
import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import mongoDBSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import path from "path";
import bodyParser from "body-parser";
import log from "./core/log";
import crypto from "crypto";
import { sha256 } from "js-sha256";

const sessions: Map<string, number> = new Map();

type Route = {
  method: string;
  path: string;
};

const exemptedFromCSRFCheck: Route[] = [];

exemptedFromCSRFCheck.push({
  method: "POST",
  path: "/users"
});

const CSRF_TOKEN_TIME_TO_LIVE = 60 * 60 * 1000; // 1 hour
const CSRF_TOKEN_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of sessions) {
    if (now - timestamp > CSRF_TOKEN_TIME_TO_LIVE) {
      sessions.delete(token);
      const tokenPrefix = token.substring(0, 8);
      log.info(`Deleted expired CSRF token beginning with ${tokenPrefix}.`);
    }
  }
}, CSRF_TOKEN_CHECK_INTERVAL);

const createCSRFToken = async function (
  request: Request,
  response: Response,
  next: NextFunction
) {
  const csrfToken = sha256(crypto.randomBytes(48).toString());
  const tokenPrefix = csrfToken.substring(0, 8);
  log.info(`Created new CSRF token beginning with ${tokenPrefix}.`);
  sessions.set(csrfToken, Date.now());
  request.csrfToken = () => {
    return csrfToken;
  };
  next();
};

const checkCSRFToken = function (
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (
    exemptedFromCSRFCheck.some(
      (route) => route.method == request.method && route.path == request.path
    )
  ) {
    next();
    return;
  }

  // no check needed if it's a GET or a HEAD or a OPTIONS request.
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  const token = request.body["csrf-token"];
  if (sessions.has(token)) {
    sessions.delete(token);
    const tokenPrefix = token.substring(0, 8);
    log.info(`Deleted used CSRF token beginning with ${tokenPrefix}.`);
    next();
  } else {
    const routeName = `${request.method} ${request.path}`;
    const error = new Error(`Invalid CSRF Token for ${routeName}.`);
    error.name = "ForbiddenError";
    next(error);
  }
};

require("@dotenvx/dotenvx").config({
  path: path.join(__dirname, "../../credentials/.env")
});

const cors = require("cors");
const corsOptions = {
  origin: ["https://mathematicalbasedefenders.com", "http://localhost:8000"],
  credentials: true
};

const jsonParser = bodyParser.json();

const PORT = 9000;
const DATABASE_URI: string | undefined = process.env.DATABASE_CONNECTION_URI;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  handler: function (request, response) {
    log.warn(`Rate limited IP ${request.ip}`);
    response.status(429).json({
      statusCode: 429,
      success: false,
      error: "You are being rate limited."
    });
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
app.use(jsonParser);
app.use(cookieParser());
app.use(createCSRFToken);
app.use(checkCSRFToken);

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
  .readdirSync(path.join(__dirname, "../api/routes"))
  .forEach((file: string) => {
    app.use(require(path.join(__dirname, "../api/routes", file)).router);
  });

// PUT THIS LAST (404)
app.all("*", function (request: Request, response: Response) {
  response
    .status(404)
    .json({ statusCode: 404, success: false, error: "Not Found." });
});

// stuff that needs to be at the end
app.use(
  (error: Error, request: Request, response: Response, next: NextFunction) => {
    log.error(error.stack);
    if (error.name === "ForbiddenError") {
      response.status(403).json({
        statusCode: 403,
        success: false,
        error:
          "Forbidden Error. You don't have access to perform this operation. (Contact the server administrator if this persists.)"
      });
    } else {
      response.status(500).json({
        statusCode: 500,
        success: false,
        error:
          "Internal Server Error. (Contact the server administrator if this persists.)"
      });
    }
  }
);

app.listen(PORT, () => {
  log.info(`App listening at http://localhost:${PORT}`);
  if (process.env.CREDENTIAL_SET_USED !== "production") {
    log.warn(`Using testing credentials.`);
  }
});
