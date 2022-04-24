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

const Schema = mongoose.Schema;
const defaultWindow = new JSDOM("").window;
const DOMPurify = createDOMPurify(defaultWindow);

const log = require("./server/core/log.js");
const schemas = require("./server/core/schemas.js");

const app = express();

const PORT = 8080;

const SALT_ROUNDS = 16;

const credentials = require("./credentials/credentials.js");

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

app.use(favicon(__dirname + "/public/assets/images/favicon.ico"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(mongoDBSanitize());
app.use(limiter);
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "connect-src": [
                    "'self'",
                    "'unsafe-inline'",
                    "https://www.googletagmanager.com",
                    "https://www.google-analytics.com"
                ],
                "script-src": [
                    "'self'",
                    "'unsafe-inline'",
                    "code.jquery.com",
                    "www.googletagmanager.com",
                    "https://www.google.com/recaptcha/",
                    "https://www.gstatic.com/recaptcha/"
                ],
                "frame-src": [
                    "'self'",
                    "'unsafe-inline'",
                    "https://www.google.com/recaptcha/",
                    "https://recaptcha.google.com/recaptcha/"
                ],
                "script-src-attr": ["'self'", "'unsafe-inline'"]
            }
        }
    })
);
app.use(cookieParser());

const PendingUserSchema = new Schema({
    username: String,
    usernameInAllLowercase: String,
    emailAddress: String,
    hashedPassword: String,
    emailConfirmationLink: String,
    emailConfirmationCode: String,
    expiresAt: {
        type: Date,
        default: new Date(Date.now() + 1800000).getTime(),
        expires: 1800
    }
});

const PendingPasswordResetSchema = new Schema({
    emailAddress: String,
    passwordResetConfirmationLink: String,
    passwordResetConfirmationCode: String,
    expiresAt: {
        type: Date,
        default: new Date(Date.now() + 1800000).getTime(),
        expires: 1800
    }
});

const IDSchema = new Schema({
    _id: mongoose.Schema.Types.ObjectId,
    usersRegistered: Number
});

PendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 1800 });
PendingPasswordResetSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 1800 }
);

const PendingUserModel = mongoose.model(
    "PendingUserModel",
    PendingUserSchema,
    "pendingUsers"
);
const PendingPasswordResetModel = mongoose.model(
    "PendingPasswordResetModel",
    PendingPasswordResetSchema,
    "pendingPasswordResets"
);

const MetadataModel = mongoose.model("IDModel", IDSchema, "metadata");

// pages
app.get("/", (request, response) => {
    response.render(__dirname + "/views/pages/index");
});

app.get("/play", (request, response) => {
    response.render(__dirname + "/views/pages/play");
});

app.get("/register", csrfProtection, (request, response) => {
    response.cookie("csrfToken", request.csrfToken());
    response.render(__dirname + "/views/pages/register");
});

app.get("/attributions", (request, response) => {
    response.render(__dirname + "/views/pages/attributions");
});

app.get("/statistics", (request, response) => {
    schemas.getUserModel().countDocuments({}, function (error, count) {
        if (error) {
            console.error(log.addMetadata(error.stack, "error"));
        }
        response.render(__dirname + "/views/pages/statistics", {
            statistics: { registeredUsers: count }
        });
    });
});

app.get("/users", async (request, response) => {

    let query = mongoDBSanitize.sanitize(url.parse(request.url, true)).query;
    let username = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.username));
    let number = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.number));
    let data;
    let invalid = false;

    if (!/^[0-9a-zA-Z_]+$/.test(username)) {
        invalid = true;
    }
    if (isNaN(number)) {
        invalid = true;
    }
    if (!username && !number) {
        invalid = true;
    }

    if (username) {
        if (!invalid) {
            data = await schemas
                .getUserModel()
                .findOne({ username: username }, function (error, result) {
                    if (error) {
                        console.error(log.addMetadata(error.stack, "error"));
                    }
                    return result;
                });
        }
    } else {
        if (!invalid) {
            data = await schemas
                .getUserModel()
                .findOne({ userNumber: number }, function (error, result) {
                    if (error) {
                        console.error(log.addMetadata(error.stack, "error"));
                    }
                    return result;
                });
        }
    }

    // why?
    if (data && !invalid) {

        data = _.cloneDeep(data);
        let easyModeLeaderboardRank = await schemas
            .getEasyModeLeaderboardsModel()
            .findOne({
                userIDOfHolder: data["_id"]
            });
        let standardModeLeaderboardRank = await schemas
            .getStandardModeLeaderboardsModel()
            .findOne({
                userIDOfHolder: data["_id"]
            });

        if (easyModeLeaderboardRank) {
            easyModeLeaderboardRank = JSON.parse(
                JSON.stringify(easyModeLeaderboardRank)
            ).rankNumber;
        }
        if (standardModeLeaderboardRank) {
            standardModeLeaderboardRank = JSON.parse(
                JSON.stringify(standardModeLeaderboardRank)
            ).rankNumber;
        }

        
        data.rank = calculateRank(data);
        data.rankColor = getRankColor(calculateRank(data));
        data.emailAddress = "";
        data.hashedPassword = "";
        data.statistics.easyModeLeaderboardRank = easyModeLeaderboardRank;
        data.statistics.standardModeLeaderboardRank = standardModeLeaderboardRank;
        data.statistics.currentLevel = `${getLevel(data.statistics.totalExperiencePoints)}`;
        data.statistics.progressToNextLevelInPercentage = `${parseFloat((getProgressToNextLevel(data.statistics.totalExperiencePoints)*100).toFixed(3)).toString()}%`;

        response.render(__dirname + "/views/pages/users.ejs", {data: data});

    } else {
        response.render(__dirname + "/views/pages/not-found.ejs");
    }
});

app.get("/privacy-policy", (request, response) => {
    response.render(__dirname + "/views/pages/privacy-policy");
});

app.get("/leaderboards", async (request, response) => {



    let leaderboardsSchema;
    let query = mongoDBSanitize.sanitize(url.parse(request.url, true)).query;
    let mode = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.mode));

    if (!mode) {
        response.redirect("/leaderboards?mode=standard");
        return;
    }

    let startCasedMode = _.startCase(mode)

    switch (mode) {
        case "easy": {
            // $("#title").text("Leaderboards (Easy Mode)");

            leaderboardsSchema = schemas.getEasyModeLeaderboardsModel();
            break;
        }
        case "standard": {
            // $("#title").text("Leaderboards (Standard Mode)");
            leaderboardsSchema = schemas.getStandardModeLeaderboardsModel();
            break;
        }
        default: {
            response.render(__dirname + "/views/pages/not-found");
            return;
        }
    }

    let allPlayersOnLeaderboardsLoaded = false;
    let leaderboardData = await leaderboardsSchema.find({
        rankNumber: { $lt: 51 }
    });
    let playerData = {};

    for (let i = 1; i <= 50; i++) {
        let objectID;
        for (let object of leaderboardData) {
            if (object.rankNumber == i) {
                objectID = object.userIDOfHolder.toString();
                break;
            }
        }

        if (objectID != "???") {
            let playerRecord = await schemas
                .getUserModel()
                .findById(objectID, function (error2, result2) {
                    return result2;
                });
                playerData[i] = [];
            playerData[i][0] = playerRecord.username;
            playerData[i][1] = calculateRank(playerRecord);
            playerData[i][2] = getRankColor(playerData[i][1]);
        }
    }

    response.render(__dirname + "/views/pages/leaderboards", {
        leaderboardData: leaderboardData,
        playerData: playerData,
        gameMode: startCasedMode,
    });

});

app.get("/confirm-email-address", async (request, response) => {
    let $ = cheerio.load(
        fs.readFileSync(__dirname + "/confirm-email-address.html")
    );

    let query = url.parse(request.url, true).query;
    let email = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.email));
    let code = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code));

    let pendingUserRecord = await PendingUserModel.findOne({
        emailAddress: email
    });

    if (pendingUserRecord) {
        if (pendingUserRecord["emailConfirmationCode"] == code) {
            let metadataDocument = await MetadataModel.findOne({});
            let stringifiedJSON = JSON.stringify(metadataDocument);
            let object = JSON.parse(stringifiedJSON);
            let userCount = object["usersRegistered"];

            console.log(
                log.addMetadata(
                    "There are " + userCount + " users registered.",
                    "info"
                )
            );

            let dataToSave = {
                username: pendingUserRecord["username"],
                usernameInAllLowercase:
                    pendingUserRecord["usernameInAllLowercase"],
                emailAddress: pendingUserRecord["emailAddress"],
                hashedPassword: pendingUserRecord["hashedPassword"],
                userNumber: userCount + 1,
                creationDateAndTime: Date.now(),
                statistics: {
                    gamesPlayed: 0
                },
                membership: {
                    isDeveloper: false,
                    isAdministrator: false,
                    isModerator: false,
                    isContributor: false,
                    isTester: true,
                    isDonator: false,
                    specialRank: ""
                }
            };

            let userModelToSave =
                schemas.getNewUserModelInstanceWithData(dataToSave);

            MetadataModel.findOneAndUpdate(
                { documentIsMetadata: true },
                { $inc: { usersRegistered: 1 } },
                { returnOriginal: false, new: true },
                (error3, response3) => {
                    if (error3) {
                        console.log(log.addMetadata(error3, "info"));
                        response.redirect("/?erroroccurred=true");
                        return;
                    } else {
                        console.log(
                            log.addMetadata(
                                "There are now " +
                                    (userCount + 1) +
                                    " users registered.",
                                "info"
                            )
                        );
                        userModelToSave.save((error4) => {
                            if (error4) {
                                console.log(log.addMetadata(error4, "info"));
                                response.redirect("/?erroroccurred=true");
                                return;
                            }
                        });
                    }
                }
            );

            console.log(
                log.addMetadata(
                    `User ${pendingUserRecord["username"]} validated!`,
                    "info"
                )
            );
            PendingUserModel.deleteOne({ emailAddress: email }, (error) => {
                if (error) {
                    console.error(log.addMetadata(error.stack, "error"));
                }
            });
            response.redirect("/?verifiedemail=true");
        } else {
            console.log(log.addMetadata("Failed to verify a user!", "info"));
            response.redirect("/?erroroccurred=true");
        }
    } else {
        response.redirect("/?erroroccurred=true");
    }
});

app.get("/changelog", async (request, response) => {
    response.render(__dirname + "/views/pages/changelog");
});

app.get("/about", async (request, response) => {
    response.render(__dirname + "/views/pages/about");
});

app.get("/open-source-acknowledgements", async (request, response) => {
    response.render(__dirname + "/views/pages/open-source-acknowledgements");
});

app.get("/forgot-password", csrfProtection, async (request, response) => {
    response.cookie("csrfToken", request.csrfToken());
    response.render(__dirname + "/views/pages/forgot-password");
});

app.get("/change-password", csrfProtection, async (request, response) => {
    response.cookie("csrfToken", request.csrfToken());
    let query = url.parse(request.url, true).query;
    let email = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.email));
    let code = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code));
    var pendingPasswordResetRecord = await PendingPasswordResetModel.findOne({
        emailAddress: email
    });

    if (pendingPasswordResetRecord) {
        if (
            pendingPasswordResetRecord["passwordResetConfirmationCode"] == code
        ) {
            response.render(__dirname + "/views/pages/change-password");
        } else {
            response.redirect("/?erroroccurred=true");
        }
    } else {
        response.redirect("/?erroroccurred=true");
    }
});

// process registration data
app.post("/register", parseForm, csrfProtection, async (request, response) => {
    const responseKey = DOMPurify.sanitize(
        request.body["g-recaptcha-response"]
    );
    const reCaptchaSecretKey = DOMPurify.sanitize(
        credentials.getReCAPTCHASecretKey()
    );
    const reCaptchaURL = DOMPurify.sanitize(
        `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
    );

    let desiredUsername = DOMPurify.sanitize(
        mongoDBSanitize.sanitize(request.body.username)
    );
    let desiredEmail = DOMPurify.sanitize(
        mongoDBSanitize.sanitize(request.body.email)
    );
    let desiredUsernameInAllLowercase = DOMPurify.sanitize(
        mongoDBSanitize.sanitize(request.body.username)
    );
    desiredUsernameInAllLowercase = DOMPurify.sanitize(
        desiredUsernameInAllLowercase.toLowerCase()
    );

    // var usernameIsAvailable1 = await schemas.getUserModel().findOne({ username: desiredUsername }).select(desiredUsername);
    let emailIsNotAvailable1 = await schemas
        .getUserModel()
        .findOne({
            emailAddress: desiredEmail
        })
        .select(desiredEmail);
    let usernameIsNotAvailable1 = await schemas
        .getUserModel()
        .findOne({
            usernameInAllLowercase: desiredUsernameInAllLowercase
        })
        .select(desiredUsernameInAllLowercase);
    let emailIsNotAvailable2 = await PendingUserModel.findOne({
        emailAddress: desiredEmail
    }).select(desiredEmail);
    let usernameIsNotAvailable2 = await PendingUserModel.findOne({
        usernameInAllLowercase: desiredUsernameInAllLowercase
    }).select(desiredUsernameInAllLowercase);

    var metadataDocument = await MetadataModel.findOne({});

    fetch(reCaptchaURL, { method: "post" })
        .then((response) => response.json())
        .then((google_response) => {
            if (google_response.success == true) {
                if (usernameIsNotAvailable1 || usernameIsNotAvailable2) {
                    // registration failed - username already taken
                    response.redirect(
                        "?erroroccurred=true&errorreason=usernamealreadytaken"
                    );
                    return;
                } else {
                    if (
                        !/^[0-9a-zA-Z_]+$/.test(desiredUsername) ||
                        desiredUsername.length > 32 ||
                        desiredUsername.length < 3 ||
                        desiredUsername == "" ||
                        desiredUsername == null
                    ) {
                        // registration failed - username not valid
                        response.redirect(
                            "?erroroccurred=true&errorreason=usernamenotvalid"
                        );
                        return;
                    } else {
                        if (
                            !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
                                desiredEmail
                            ) ||
                            desiredEmail == "" ||
                            desiredEmail == null
                        ) {
                            response.redirect(
                                "?erroroccurred=true&errorreason=emailnotvalid"
                            );
                            return;
                        } else {
                            if (emailIsNotAvailable1 || emailIsNotAvailable2) {
                                // registration failed - email already taken
                                response.redirect(
                                    "?erroroccurred=true&errorreason=emailalreadytaken"
                                );
                                return;
                            } else {
                                let plaintextPassword = DOMPurify.sanitize(
                                    mongoDBSanitize.sanitize(
                                        request.body.password
                                    )
                                );
                                if (
                                    plaintextPassword.length < 8 ||
                                    plaintextPassword.length > 64 ||
                                    plaintextPassword == "" ||
                                    plaintextPassword == null ||
                                    plaintextPassword.includes(" ") ||
                                    !/^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(
                                        plaintextPassword
                                    )
                                ) {
                                    response.redirect(
                                        "?erroroccurred=true&errorreason=passwordnotvalid"
                                    );
                                    return;
                                } else {
                                    var hashedPasswordToSave;
                                    bcrypt.genSalt(
                                        SALT_ROUNDS,
                                        function (error1, salt) {
                                            if (error1) {
                                                response.redirect(
                                                    "?erroroccurred=true&errorreason=internalerror"
                                                );
                                                return;
                                            } else {
                                                bcrypt.hash(
                                                    plaintextPassword,
                                                    salt,
                                                    function (error2, hash) {
                                                        if (error2) {
                                                            response.redirect(
                                                                "?erroroccurred=true&errorreason=internalerror"
                                                            );
                                                            return;
                                                        } else {
                                                            hashedPasswordToSave =
                                                                hash;
                                                            emailConfirmationCode =
                                                                uuidv4();
                                                            let dataToSave = {
                                                                username:
                                                                    desiredUsername,
                                                                usernameInAllLowercase:
                                                                    desiredUsernameInAllLowercase,
                                                                emailAddress:
                                                                    desiredEmail,
                                                                hashedPassword:
                                                                    hashedPasswordToSave,
                                                                emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}`,
                                                                emailConfirmationCode:
                                                                    emailConfirmationCode,
                                                                expiresAt:
                                                                    new Date(
                                                                        Date.now() +
                                                                            1800000
                                                                    ).getTime()
                                                            };
                                                            const pendingUserModelToSave =
                                                                new PendingUserModel(
                                                                    dataToSave
                                                                );
                                                            pendingUserModelToSave.save(
                                                                (error4) => {
                                                                    if (
                                                                        error4
                                                                    ) {
                                                                        response.redirect(
                                                                            "?erroroccurred=true&errorreason=internalerror"
                                                                        );
                                                                        return;
                                                                    } else {
                                                                        let transporter =
                                                                            nodemailer.createTransport(
                                                                                credentials.getNodemailerOptionsObject()
                                                                            );
                                                                        let message =
                                                                            {
                                                                                from: "Mathematical Base Defenders Support <support@mathematicalbasedefenders.com>",
                                                                                to: desiredEmail,
                                                                                subject:
                                                                                    "Email Confirmation for Mathematical Base Defenders",
                                                                                html: `
														<p>
															Thanks for signing up for Mathematical Base Defenders!
															<br>
															In order to fully activate your account, please click the activation link below.
															<br>
															<a href=https://mathematicalbasedefenders.com/confirm-email-address?email=${DOMPurify.sanitize(
                                                                desiredEmail
                                                            )}&code=${DOMPurify.sanitize(
                                                                                    emailConfirmationCode
                                                                                )}>https://mathematicalbasedefenders.com/confirm-email-address?email=${DOMPurify.sanitize(
                                                                                    desiredEmail
                                                                                )}&code=${DOMPurify.sanitize(
                                                                                    emailConfirmationCode
                                                                                )}</a>
															<br>
															This link will expire in 30 minutes. After that, your account will be deleted and you may sign up again. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
														</p>
														`
                                                                            };
                                                                        transporter.sendMail(
                                                                            message,
                                                                            (
                                                                                error,
                                                                                information
                                                                            ) => {
                                                                                if (
                                                                                    error
                                                                                ) {
                                                                                    console.error(
                                                                                        log.addMetadata(
                                                                                            error.stack,
                                                                                            "error"
                                                                                        )
                                                                                    );
                                                                                    response.redirect(
                                                                                        "?erroroccurred=true&errorreason=internalerror"
                                                                                    );
                                                                                    return;
                                                                                } else {
                                                                                    console.log(
                                                                                        log.addMetadata(
                                                                                            "Successfully sent verification message to " +
                                                                                                desiredEmail +
                                                                                                "!",
                                                                                            "info"
                                                                                        )
                                                                                    );
                                                                                    console.log(
                                                                                        log.addMetadata(
                                                                                            "New Unconfirmed User: " +
                                                                                                desiredUsername +
                                                                                                " (" +
                                                                                                desiredEmail +
                                                                                                ")",
                                                                                            "info"
                                                                                        )
                                                                                    );
                                                                                    response.redirect(
                                                                                        "/?signup=success"
                                                                                    );
                                                                                }
                                                                            }
                                                                        );
                                                                    }
                                                                }
                                                            );
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                    );
                                }
                            }
                        }
                    }
                }
            } else {
                response.redirect(
                    "?erroroccurred=true&errorreason=captchanotcomplete"
                );
                return;
            }
        });
});

// process password reset request

app.post(
    "/forgot-password",
    parseForm,
    csrfProtection,
    async (request, response) => {
        const responseKey = DOMPurify.sanitize(
            request.body["g-recaptcha-response"]
        );
        const reCaptchaSecretKey = DOMPurify.sanitize(
            credentials.getReCAPTCHASecretKey()
        );
        const reCaptchaURL = DOMPurify.sanitize(
            `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
        );

        let desiredEmail = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body.email)
        );
        let passwordResetConfirmationCode = DOMPurify.sanitize(uuidv4());

        let playerData = await schemas.getUserModel().findOne({
            emailAddress: desiredEmail
        });

        if (playerData) {
            fetch(reCaptchaURL, { method: "post" })
                .then((response) => response.json())
                .then((google_response) => {
                    if (google_response.success == true) {
                        let dataToSave = {
                            emailAddress: desiredEmail,
                            passwordResetConfirmationLink: `https://mathematicalbasedefenders.com/change-password?email=${desiredEmail}&code=${passwordResetConfirmationCode}`,
                            passwordResetConfirmationCode:
                                passwordResetConfirmationCode,
                            expiresAt: new Date(Date.now() + 1800000).getTime()
                        };
                        let pendingPasswordResetToSave =
                            new PendingPasswordResetModel(dataToSave);
                        pendingPasswordResetToSave.save((error4) => {
                            if (error4) {
                                console.log(
                                    log.addMetadata(error4.stack, "info")
                                );
                                response.redirect("/?resetpassword=fail");
                            } else {
                                let transporter = nodemailer.createTransport(
                                    credentials.getNodemailerOptionsObject()
                                );
                                let message = {
                                    from: "Mathematical Base Defenders Support <support@mathematicalbasedefenders.com>",
                                    to: desiredEmail,
                                    subject:
                                        "Password Reset Confirmation for Mathematical Base Defenders",
                                    html: `
							<p>
								Someone requested a password reset for your Mathematical Base Defenders account.
								<br>
								If this is you, and you want continue with the procedure, please click this link.
								<br>
								<a href=https://mathematicalbasedefenders.com/change-password/?email={desiredEmail}?code=${DOMPurify.sanitize(
                                    passwordResetConfirmationCode
                                )}>https://mathematicalbasedefenders.com/change-password?email=${DOMPurify.sanitize(
                                        desiredEmail
                                    )}&code=${DOMPurify.sanitize(
                                        passwordResetConfirmationCode
                                    )}</a>
								<br>
								This link will expire in 30 minutes. After that, you may request a new password reset link. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
							</p>
							`
                                };
                                transporter.sendMail(
                                    message,
                                    (error, information) => {
                                        if (error) {
                                            console.error(
                                                log.addMetadata(
                                                    error.stack,
                                                    "error"
                                                )
                                            );
                                            response.redirect(
                                                "?erroroccurred=true"
                                            );
                                        } else {
                                            response.redirect(
                                                "/?sentpasswordresetlink=true"
                                            );
                                        }
                                    }
                                );
                            }
                        });
                    } else {
                        response.redirect("?resetpassword=fail");
                    }
                });
        } else {
            console.error(
                log.addMetadata(
                    `No user with e-mail address ${desiredEmail} found!`,
                    "error"
                )
            );
            response.redirect("?erroroccurred=true");
        }
    }
);

// process password reset request on page
app.post(
    "/change-password",
    parseForm,
    csrfProtection,
    async (request, response) => {
        let query = url.parse(request.url, true).query;
        let email = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.email));
        let code = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code));
        let newPassword = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body.password)
        );
        let confirmNewPassword = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body["confirm-password"])
        );

        let record = await PendingPasswordResetModel.find({
            $and: [{ emailAddress: email }, { code: code }]
        });

        if (record) {
            if (
                !(
                    newPassword.length < 8 ||
                    newPassword.length > 64 ||
                    newPassword == "" ||
                    newPassword == null ||
                    newPassword.includes(" ") ||
                    !/^[0-9a-zA-Z!"#%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(
                        newPassword
                    ) ||
                    newPassword != confirmNewPassword
                )
            ) {
                bcrypt.genSalt(SALT_ROUNDS, function (error1, salt) {
                    if (error1) {
                        console.error(log.addMetadata(error1.stack, "error"));
                        response.redirect("/?erroroccurred=true");
                    } else {
                        bcrypt.hash(
                            newPassword,
                            salt,
                            async function (error2, hash) {
                                if (error2) {
                                    console.error(
                                        log.addMetadata(error2.stack, "error")
                                    );
                                    response.redirect("/?erroroccurred=true");
                                } else {
                                    PendingPasswordResetModel.deleteOne(
                                        { emailAddress: email },
                                        (error3, response3) => {
                                            if (error3) {
                                                console.error(
                                                    log.addMetadata(
                                                        error3.stack,
                                                        "error"
                                                    )
                                                );
                                                response.redirect(
                                                    "/?erroroccurred=true"
                                                );
                                            } else {
                                                schemas
                                                    .getUserModel()
                                                    .findOneAndUpdate(
                                                        { emailAddress: email },
                                                        {
                                                            hashedPassword: hash
                                                        },
                                                        {
                                                            useFindAndModify: true,
                                                            new: true
                                                        },
                                                        (error, response2) => {
                                                            if (error) {
                                                                console.error(
                                                                    log.addMetadata(
                                                                        error.stack,
                                                                        "error"
                                                                    )
                                                                );
                                                                response.redirect(
                                                                    "/?erroroccurred=true"
                                                                );
                                                            } else {
                                                                console.log(
                                                                    log.addMetadata(
                                                                        "Successfully changed password for a user!",
                                                                        "info"
                                                                    )
                                                                );
                                                                response.redirect(
                                                                    "/?changedPassword=true"
                                                                );
                                                            }
                                                        }
                                                    );
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                });
            } else {
                response.redirect("/?erroroccurred=true");
            }
        } else {
            response.redirect("/?erroroccurred=true");
        }
    }
);

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
    res.status(404).render(__dirname + "/views/pages/404");
});

// other functions

async function getRepositoryLink(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, "utf8", function (error, data) {
            if (error) {
                resolve("(No repository link found.)");
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

function calculateRank(data) {
    if (data.username == "mistertfy64") {
        // hardcode
        return "Game Master";
    } else if (data.membership.isDeveloper) {
        return "Developer";
    } else if (data.membership.isAdministrator) {
        return "Administrator";
    } else if (data.membership.isModerator) {
        return "Moderator";
    } else if (data.membership.isContributor) {
        return "Contributor";
    } else if (data.membership.isTester) {
        return "Tester";
    } else if (data.membership.isDonator) {
        return "Donator";
    } else {
        // default rank
        return "";
    }
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

function getRankColor(rank) {
    if (rank == "Game Master") {
        return "#ff0000";
    } else if (rank == "Developer") {
        return "#ff0000";
    } else if (rank == "Administrator") {
        return "#ff0000";
    } else if (rank == "Moderator") {
        return "#ff6800";
    } else if (rank == "Contributor") {
        return "#4070ff";
    } else if (rank == "Tester") {
        return "#0194ff";
    } else if (rank == "Donator") {
        return "#00dd00";
    }
    return "#000000";
}

function getLevel(experiencePoints) {
    let currentLevel = 0;
    while (500 * Math.pow(currentLevel + 1, 0.75) <= experiencePoints) {
        experiencePoints -= 500 * Math.pow(currentLevel + 1, 0.75);
        currentLevel++;
    }
    return currentLevel;
}

function getProgressToNextLevel(experiencePoints) {
    let currentLevel = 0;
    while (500 * Math.pow(currentLevel + 1, 0.75) <= experiencePoints) {
        experiencePoints -= 500 * Math.pow(currentLevel + 1, 0.75);
        currentLevel++;
    }
    return experiencePoints / (500 * Math.pow(currentLevel + 1, 0.75));
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