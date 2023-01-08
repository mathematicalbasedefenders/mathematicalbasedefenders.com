#!/usr/bin/env nodejs
import https from "https";

import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import cheerio from "cheerio";
import cookieParser from "cookie-parser";
import createDOMPurify from "dompurify";
import csurf from "csurf";
import express from "express";
import favicon from "serve-favicon";
import fetch from "isomorphic-fetch";
import fs from "fs";
import helmet from "helmet";
import licenseChecker from "license-checker";
import { marked } from "marked";
import mongoDBSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import url from "url";
import _ from "lodash";
import { JSDOM } from "jsdom";
import { v4 } from "uuid";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../credentials/.env") });

const Schema = mongoose.Schema;

const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

import { addLogMessageMetadata, LogMessageLevel } from "./server/core/log";

const app = express();

const PORT = 8080;

const DATABASE_URI: string | undefined = process.env.DATABASE_CONNECTION_URI;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const csrfProtection = csurf({ cookie: true });
const parseForm = bodyParser.urlencoded({ extended: false });

interface LicenseData {
  [key: string]: {
    homepage: string | Promise<unknown>;
    license: string | Promise<unknown>;
  };
}
var licenses = <LicenseData>{};

let getLicenses = async () => {
  return await new Promise((resolve, reject) => {
    licenseChecker.init(
      {
        start: path.join(__dirname, "..")
      },
      function (error: any, packages: any) {
        if (error) {
          console.log(
            addLogMessageMetadata(error.stack, LogMessageLevel.ERROR)
          );
        } else {
          let licensesToReturn = <LicenseData>{};
          let moduleNames: Array<string> = [];
          for (let key of Object.keys(packages)) {
            let toAdd = key;
            toAdd = toAdd.replace(
              /^(@[a-z0-9-~][a-z0-9-._~]*\/)?([a-z0-9-~][a-z0-9-._~]*)(@[\d\.]*)(-rc\.[0-9]*)?$/g,
              "$1$2"
            );
            moduleNames.push(toAdd);
          }
          moduleNames = moduleNames.filter((moduleName) => {
            return !(moduleName.indexOf("mathematicalbasedefenders.com") > -1);
          });
          for (let moduleName of moduleNames) {
            licensesToReturn[moduleName.toString()] = {
              homepage: getRepositoryLink(
                path.join(
                  __dirname,
                  "..",
                  "/node_modules/",
                  moduleName,
                  "/package.json"
                )
              ),
              license: readLicenseFile(
                path.join(__dirname, "..", "/node_modules/", moduleName)
              )
            };
          }
          resolve(licensesToReturn);
        }
      }
    );
  });
};

getLicenses().then((value: any) => {
  licenses = value;
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
import { resolve } from "path";

// other stuff
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "server/views"));
app.use(favicon(__dirname + "/public/assets/images/favicon.ico"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(mongoDBSanitize());
app.use(limiter);
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
// app.use(requireDirectory("./routes"));

require("fs")
  .readdirSync(require("path").join(__dirname, "./server/routes"))
  .forEach((file: any) => {
    app.use(require("./server/routes/" + file).router);
  });
require("fs")
  .readdirSync(require("path").join(__dirname, "./server/api"))
  .forEach((file: any) => {
    app.use(require("./server/api/" + file).router);
  });

app.post(
  "/fetch-open-source-licenses",
  limiter,
  async (request: any, response: any) => {
    let licensesToShow = <LicenseData>{};
    for (let key in licenses) {
      licensesToShow[key.toString()] = {
        homepage: "",
        license: ""
      };
      let homepage = await licenses[key]["homepage"];
      if (homepage) {
        licensesToShow[key.toString()]["homepage"] = homepage as string;
      } else {
        licensesToShow[key.toString()]["homepage"] = "";
      }
      let license = await licenses[key]["license"];
      if (license) {
        licensesToShow[key.toString()]["license"] = license as string;
      } else {
        licensesToShow[key.toString()]["license"] = "(No license found.)";
      }
    }
    response.send(JSON.stringify(licensesToShow));
  }
);

app.post("/fetch-game-changelog", async (request: any, response: any) => {
  let changelog: unknown = "";
  await getTextFromURL("game").then((result) => {
    changelog = result;
  });
  changelog = DOMPurify.sanitize(changelog as string);
  response.send(changelog);
});

app.post("/fetch-website-changelog", async (request: any, response: any) => {
  let changelog: unknown = "";
  await getTextFromURL("website").then((result) => {
    changelog = result;
  });
  changelog = DOMPurify.sanitize(changelog as string);
  response.send(changelog);
});

// PUT THIS LAST (404 page)

app.get("*", function (request: any, response: any) {
  response
    .status(404)
    .render(__dirname + "/server/views/pages/404", { resourceName: "page" });
});

// other functions

async function getRepositoryLink(path: string) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", function (error, data) {
      if (error) {
        resolve("(No repository link found.)");
        return;
      }
      if (data == null) {
        resolve("(No repository link found.)");
        return;
      }
      resolve(JSON.parse(data).homepage);
    });
  });
}

async function readLicenseFile(path: string) {
  return new Promise((resolve, reject) => {
    path += "/LICENSE";
    fs.readFile(path, "utf8", function (error, data) {
      if (error) {
        path += ".md";
        resolve(
          new Promise((resolve, reject) => {
            fs.readFile(path, "utf8", function (error, data) {
              if (error) {
                resolve("(No LICENSE file found.)");
              }
              resolve(data);
            });
          })
        );
      }
      resolve(data);
    });
  });
}

async function getTextFromURL(service: string) {
  let fileURL: string = "";
  switch (service) {
    case "game": {
      fileURL =
        "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/GAME_CHANGELOG.md";
      break;
    }
    case "website": {
      fileURL =
        "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/WEBSITE_CHANGELOG.md";
      break;
    }
    case "about": {
      fileURL =
        "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/ABOUT.md";
      break;
    }
    case "privacyPolicy": {
      fileURL =
        "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/PRIVACY_POLICY.md";
      break;
    }
    default: {
      return "";
    }
  }
  return new Promise(async (resolve, reject) => {
    let data = "";
    https.get(fileURL, (response) => {
      response.on("data", (chunk) => {
        data += chunk.toString("utf-8");
      });
      response.on("end", function () {
        resolve(marked.parse(data));
      });
    });
  });
}

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
