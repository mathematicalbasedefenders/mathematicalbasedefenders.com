#!/usr/bin/env nodejs
const https = require("https");

const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cheerio = require("cheerio");
const cookieParser = require("cookie-parser");
const createDOMPurify = require("dompurify");
const csurf = require("csurf");
const express = require("express");
const favicon = require("serve-favicon");
const fetch = require("isomorphic-fetch");
const fs = require("fs");
const helmet = require("helmet");
const licenseChecker = require("license-checker");
const marked = require("marked");
const mongoDBSanitize = require("express-mongo-sanitize");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const url = require("url");
const _ = require("lodash");
const { JSDOM } = require("jsdom");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const Schema = mongoose.Schema;

const defaultWindow = new JSDOM("").window;
const DOMPurify = createDOMPurify(defaultWindow);

const log = require("./server/core/log.js");
const schemas = require("./server/core/schemas.js");

const app = express();

const PORT = 8080;

const SALT_ROUNDS = 16;

const credentials = require("./server/credentials/credentials.js");

const uri = credentials.getMongooseURI();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const csrfProtection = csurf({ cookie: true });
const parseForm = bodyParser.urlencoded({ extended: false });

var licenses = {};

let getLicenses = async () => {
    return await new Promise((resolve, reject) => {
        licenseChecker.init(
            {
                start: __dirname
            },
            function (error, packages) {
                if (error) {
                    console.log(log.addMetadata(error, "error"));
                } else {
                    let licensesToReturn = {};
                    let moduleNames = [];
                    for (key of Object.keys(packages)) {
                        let toAdd = key;
                        toAdd = toAdd.replace(
                            /^(@[a-z0-9-~][a-z0-9-._~]*\/)?([a-z0-9-~][a-z0-9-._~]*)(@[\d\.]*)(-rc\.[0-9]*)?$/g,
                            "$1$2"
                        );
                        moduleNames.push(toAdd);
                    }
                    moduleNames = moduleNames.filter((moduleName) => {
                        return !(
                            moduleName.indexOf(
                                "mathematicalbasedefenders.com"
                            ) > -1
                        );
                    });
                    for (let moduleName of moduleNames) {
                        licensesToReturn[moduleName.toString()] = {
                            homepage: getRepositoryLink(
                                __dirname +
                                    "/node_modules/" +
                                    moduleName +
                                    "/package.json"
                            ),
                            license: readLicenseFile(
                                __dirname + "/node_modules/" + moduleName
                            )
                        };
                    }
                    resolve(licensesToReturn);
                }
            }
        );
    });
};

getLicenses().then((value) => {
    licenses = value;
});

// mongoose
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on("connected", () => {
    console.log(log.addMetadata("Successfully connected to mongoose.", "info"));
});

var ObjectId = require("mongoose").Types.ObjectId;
const { resolve } = require("path");

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
    .forEach((file) => {
        app.use(require("./server/routes/" + file));
    });
require("fs")
    .readdirSync(require("path").join(__dirname, "./server/api"))
    .forEach((file) => {
        app.use(require("./server/api/" + file));
    });

app.post("/fetch-open-source-licenses", async (request, response) => {
    let licensesToShow = {};
    for (let key in licenses) {
        licensesToShow[key.toString()] = {};
        let homepage = await licenses[key]["homepage"];
        if (homepage) {
            licensesToShow[key.toString()]["homepage"] = homepage;
        } else {
            licensesToShow[key.toString()]["homepage"] = "";
        }
        let license = await licenses[key]["license"];
        if (license) {
            licensesToShow[key.toString()]["license"] = license;
        } else {
            licensesToShow[key.toString()]["license"] = "(No license found.)";
        }
    }
    response.send(JSON.stringify(licensesToShow));
});

app.post("/fetch-game-changelog", async (request, response) => {
    let changelog;
    await loadChangelog("game").then((result) => {
        changelog = result;
    });
    changelog = DOMPurify.sanitize(changelog);
    response.send(changelog);
});

app.post("/fetch-website-changelog", async (request, response) => {
    let changelog;
    await loadChangelog("website").then((result) => {
        changelog = result;
    });
    changelog = DOMPurify.sanitize(changelog);
    response.send(changelog);
});

// PUT THIS LAST (404 page)

app.get("*", function (req, res) {
    res.status(404).render(__dirname + "/server/views/pages/404");
});

// other functions

async function getRepositoryLink(path) {
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

async function readLicenseFile(path) {
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

async function loadChangelog(service) {
    let fileURL;
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
        default: {
            return "";
        }
    }
    return new Promise(async (resolve, reject) => {
        let data = "";
        await https.get(fileURL, (response) => {
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
app.use((error, request, response, next) => {
    console.error(log.addMetadata(error.stack, "error"));
    response.status(500);
    response.render(__dirname + "/views/pages/error");
});

// start

app.listen(PORT, () => {
    console.log(
        log.addMetadata(`App listening at https://localhost:${PORT}`, "info")
    );
    if (credentials.getWhetherTestingCredentialsAreUsed()) {
        console.log(
            log.addMetadata(`WARNING: Using testing credentials.`, "info")
        );
    }
});
