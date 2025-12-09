#!/usr/bin/env nodejs
import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import favicon from "serve-favicon";
import helmet from "helmet";
import mongoDBSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import path from "path";

require("@dotenvx/dotenvx").config({
  path: path.join(__dirname, "../../credentials/.env")
});

const cors = require("cors");
const corsOptions = {
  origin: [
    "https://mathematicalbasedefenders.com",
    "http://localhost:8000",
    "http://localhost:9000"
  ],
  credentials: true
};

import { log } from "./core/log";
import { getLicenses } from "./core/licenses";

const PORT = 8000;
const API_PORT = 9000;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: function (request, response) {
    log.warn(`Rate limited IP ${request.ip}`);
    response
      .status(429)
      .render(path.join(__dirname, "..", "www/views/pages/429.ejs"));
    return;
  }
});

const app = express();
app.set("trust proxy", 2);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "www/views"));
app.use(
  favicon(path.join(__dirname, "..", "/www/public/assets/images/favicon.ico"))
);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "/www/public")));
app.use(mongoDBSanitize());
app.use(limiter);
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "connect-src": [
          "'self'",
          "'unsafe-inline'",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          "https://*.googlesyndication.com",
          "https://googleads.g.doubleclick.net/",
          "https://*.google.co.th",
          "https://*.google.com",
          "https://*.googleadservices.com",
          "https://storage.mistertfy64.com"
        ],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "code.jquery.com",
          "www.googletagmanager.com",
          "https://www.google.com/recaptcha/",
          "https://www.gstatic.com/recaptcha/",
          "https://*.googlesyndication.com",
          "https://googleads.g.doubleclick.net/",
          "https://*.google.co.th",
          "https://*.google.com",
          "https://*.googleadservices.com"
        ],
        "frame-src": [
          "'self'",
          "'unsafe-inline'",
          "https://www.google.com/recaptcha/",
          "https://recaptcha.google.com/recaptcha/",
          "https://*.googlesyndication.com",
          "https://googleads.g.doubleclick.net/",
          "https://*.google.co.th",
          "https://*.google.com",
          "https://*.googleadservices.com"
        ],
        "img-src": [
          "'self'",
          "'unsafe-inline'",
          "https://*.googlesyndication.com",
          "https://storage.mistertfy64.com"
        ],
        "script-src-attr": ["'self'", "'unsafe-inline'"],
        "form-action": ["'self'", "https://play.mathematicalbasedefenders.com"]
      }
    }
  })
);
app.use(cookieParser());

let licenses;
let apiBaseURL: string =
  process.env.CREDENTIAL_SET_USED !== "production"
    ? "http://localhost:9000"
    : "https://api.mathematicalbasedefenders.com";

// Routes
require("fs")
  .readdirSync(require("path").join(__dirname, "../www/routes"))
  .filter((file: string) => file.endsWith(".ts") || file.endsWith(".js"))
  .forEach((file: string) => {
    app.use(require("../www/routes/" + file).router);
  });

require("fs")
  .readdirSync(require("path").join(__dirname, "../www/api"))
  .filter((file: string) => file.endsWith(".ts") || file.endsWith(".js"))
  .forEach((file: string) => {
    app.use(require("../www/api/" + file).router);
  });

// PUT THIS LAST (404 page)
app.all("*", function (request: Request, response: Response) {
  response
    .status(404)
    .render(path.join(__dirname, "..", "/www/views/pages/404"), {
      resourceName: "page"
    });
});

// stuff that needs to be at the end
app.use(
  (error: Error, request: Request, response: Response, next: NextFunction) => {
    log.error(`${error.name}: ${error.message}`);
    log.error(error.stack);
    if (error.name === "ForbiddenError") {
      response.status(403);
      response.render(path.join(__dirname, "..", "www/views/pages/403.ejs"));
    } else {
      response.status(500);
      response.render(path.join(__dirname, "..", "www/views/pages/error.ejs"));
    }
  }
);

// load licenses
async function loadLicenses() {
  licenses = await getLicenses();
  log.info("Finished reading licenses.");
}
// start
loadLicenses();

app.listen(PORT, () => {
  log.info(`App listening at http://localhost:${PORT}`);
  if (process.env.CREDENTIAL_SET_USED !== "production") {
    apiBaseURL = `http://localhost:${API_PORT}`;
    log.warn(`Using testing credentials.`);
  } else {
    apiBaseURL = `https://api.mathematicalbasedefenders.com`;
    log.info(`Using production credentials.`);
  }
});

export { licenses, apiBaseURL };
