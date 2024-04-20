#!/usr/bin/env nodejs
import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import favicon from "serve-favicon";
import helmet from "helmet";
import mongoDBSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";
const cors = require("cors");
const corsOptions = {
  origin: ["https://mathematicalbasedefenders.com", "http://localhost:8000"],
  credentials: true
};
dotenv.config({ path: path.join(__dirname, "../credentials/.env") });
import { log } from "./server/core/log";
import { getLicenses } from "./server/core/licenses";

const PORT = 8000;
const DATABASE_URI: string | undefined = process.env.DATABASE_CONNECTION_URI;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const app = express();
app.set("trust proxy", 2);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "server/views"));
app.use(favicon(__dirname + "/public/assets/images/favicon.ico"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
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
        "script-src-attr": ["'self'", "'unsafe-inline'"]
      }
    }
  })
);
app.use(cookieParser());

let licenses;

// mongoose
if (typeof DATABASE_URI === "string") {
  mongoose.connect(DATABASE_URI);
}
mongoose.connection.on("connected", () => {
  log.info("Connected to mongoose.");
});

// Routes
require("fs")
  .readdirSync(require("path").join(__dirname, "./server/routes"))
  .forEach((file: string) => {
    app.use(require("./server/routes/" + file).router);
  });

require("fs")
  .readdirSync(require("path").join(__dirname, "./server/api"))
  .forEach((file: string) => {
    app.use(require("./server/api/" + file).router);
  });

// PUT THIS LAST (404 page)
app.get("*", function (request: Request, response: Response) {
  response
    .status(404)
    .render(__dirname + "/server/views/pages/404", { resourceName: "page" });
});

// stuff that needs to be at the end
app.use(
  (error: Error, request: Request, response: Response, next: NextFunction) => {
    log.error(error.stack);
    response.status(500);
    response.render(__dirname + "/server/views/pages/error.ejs");
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
  if (process.env.CREDENTIAL_SET_USED === "testing") {
    log.warn(`Using testing credentials.`);
  }
});

export { licenses };
