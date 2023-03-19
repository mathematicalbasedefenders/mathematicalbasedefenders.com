#!/usr/bin/env nodejs
import https from "https";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import createDOMPurify from "dompurify";
import express from "express";
import favicon from "serve-favicon";
import helmet from "helmet";
import mongoDBSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import _ from "lodash";
import { JSDOM } from "jsdom";
import path from "path";
import dotenv from "dotenv";
const cors = require("cors");
const corsOptions = {
  origin: ["https://mathematicalbasedefenders.com", "http://localhost:8000"],
  credentials: true
};
dotenv.config({ path: path.join(__dirname, "../credentials/.env") });

const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

import { addLogMessageMetadata, LogMessageLevel } from "./server/core/log";

const app = express();

const PORT = 8000;

const DATABASE_URI: string | undefined = process.env.DATABASE_CONNECTION_URI;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// mongoose
if (typeof DATABASE_URI === "string") {
  mongoose.connect(DATABASE_URI);
}
mongoose.connection.on("connected", () => {
  console.log(
    addLogMessageMetadata(
      "Successfully connected to mongoose.",
      LogMessageLevel.INFO
    )
  );
});

var ObjectId = require("mongoose").Types.ObjectId;

// other stuff
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
          "https://*.googleadservices.com"
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
          "https://*.googlesyndication.com"
        ],
        "script-src-attr": ["'self'", "'unsafe-inline'"]
      }
    }
  })
);
app.use(cookieParser());
// Routes
require("fs")
  .readdirSync(require("path").join(__dirname, "./server/routes"))
  .forEach((file: any) => {
    app.use(require("./server/routes/" + file).router);
  });

// require("fs")
//   .readdirSync(require("path").join(__dirname, "./server/api"))
//   .forEach((file: any) => {
//     app.use(require("./server/api/" + file).router);
//   });

// PUT THIS LAST (404 page)
app.get("*", function (request: any, response: any) {
  response
    .status(404)
    .render(__dirname + "/server/views/pages/404", { resourceName: "page" });
});

// stuff that needs to be at the end
app.use((error: any, request: any, response: any, next: any) => {
  console.error(addLogMessageMetadata(error.stack, LogMessageLevel.ERROR));
  response.status(500);
  response.render(__dirname + "/views/pages/error");
});

// start

app.listen(PORT, () => {
  console.log(
    addLogMessageMetadata(
      `App listening at https://localhost:${PORT}`,
      LogMessageLevel.INFO
    )
  );

  if (process.env.CREDENTIAL_SET_USED === "testing") {
    console.log(
      addLogMessageMetadata(
        `Using testing credentials.`,
        LogMessageLevel.WARNING
      )
    );
  }
});
