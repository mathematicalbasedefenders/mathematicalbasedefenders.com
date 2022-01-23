#!/usr/bin/env nodejs
const https = require("https");

const fs = require("fs");
const url = require("url");
const bcrypt = require("bcrypt");
const cheerio = require("cheerio");
const fetch = require("isomorphic-fetch");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const express = require("express");
const xss = require("xss");
const mongoDBSanitize = require("express-mongo-sanitize");
const marked = require("marked");
const { JSDOM } = require("jsdom");
const createDOMPurify = require("dompurify");
const favicon = require("serve-favicon");
const rateLimit = require("express-rate-limit");
const licenseChecker = require("license-checker");
const helmet = require("helmet");

const defaultWindow = new JSDOM("").window;
const DOMPurify = createDOMPurify(defaultWindow);

const log = require("./server/core/log.js");

const app = express();

const PORT = 8080;

const SALT_ROUNDS = 16;

const credentials = require("./credentials/credentials.js");

const uri = credentials.getMongooseURI();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

let licenses = {};

let getLicenses = async () => {
    return await new Promise((resolve, reject) => {
        licenseChecker.init(
            {
                start: __dirname,
            },
            function (error, packages) {
                if (error) {
                    console.log(log.addMetadata(error, "error"));
                } else {
                    let licensesToReturn = {};
                    let moduleNames = [];
                    for (key of Object.keys(packages)) {
                        let toAdd = key;
                        toAdd = toAdd.replace(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?([a-z0-9-~][a-z0-9-._~]*)(@[\d\.]*)(-rc\.[0-9]*)?$/g, "$1$2");
                        moduleNames.push(toAdd);
                    }
                    moduleNames = moduleNames.filter((moduleName) => {
                        return !(moduleName.indexOf("mathematicalbasedefenders.com") > -1);
                    });
                    for (let moduleName of moduleNames) {
                        licensesToReturn[moduleName.toString()] = {
                            homepage: getRepositoryLink(__dirname + "/node_modules/" + moduleName + "/package.json"),
                            license: readLicenseFile(__dirname + "/node_modules/" + moduleName),
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
                "connect-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
                "script-src": ["'self'", "'unsafe-inline'", "code.jquery.com", "www.googletagmanager.com", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
                "frame-src": ["'self'", "'unsafe-inline'", "https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/"],
                "script-src-attr": ["'self'", "'unsafe-inline'"],
            },
        },
    })
);

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
        expires: 1800,
    },
});

const PendingPasswordResetSchema = new Schema({
    emailAddress: String,
    passwordResetConfirmationLink: String,
    passwordResetConfirmationCode: String,
    expiresAt: {
        type: Date,
        default: new Date(Date.now() + 1800000).getTime(),
        expires: 1800,
    },
});

const UserSchema = new Schema({
    username: String,
    usernameInAllLowercase: String,
    emailAddress: String,
    hashedPassword: String,
    userNumber: Number,
    creationDateAndTime: {
        type: Date,
        default: Date.now(),
    },
    statistics: {
        gamesPlayed: Number,
        personalBestScore: Number,
    },
    membership: {
        isDeveloper: Boolean,
        isAdministrator: Boolean,
        isModerator: Boolean,
        isContributor: Boolean,
        isTester: Boolean,
        isDonator: Boolean,
        specialRank: String,
    },
});

const IDSchema = new Schema({
    _id: mongoose.Schema.Types.ObjectId,
    usersRegistered: Number,
});

const LeaderboardsSchema = new Schema({
    _id: mongoose.Schema.Types.ObjectId,
    rank: Number,
    userIDOfHolder: String,
    score: Number,
});

PendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 1800 });
PendingPasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 1800 });

const PendingUserModel = mongoose.model("PendingUserModel", PendingUserSchema, "pendingUsers");
const PendingPasswordResetModel = mongoose.model("PendingPasswordResetSchema", PendingPasswordResetSchema, "pendingPasswordResets");

const UserModel = mongoose.model("UserModel", UserSchema, "users");
const MetadataModel = mongoose.model("IDModel", IDSchema, "metadata");
const LeaderboardsModel = mongoose.model("LeaderboardsModel", LeaderboardsSchema, "leaderboards");

// pages
app.get("/", (request, response) => {
    response.sendFile(__dirname + "/index.html");
});

app.get("/play", (request, response) => {
    response.sendFile(__dirname + "/play.html");
});

app.get("/register", (request, response) => {
    response.sendFile(__dirname + "/register.html");
});

app.get("/attributions", (request, response) => {
    response.sendFile(__dirname + "/attributions.html");
});

app.get("/statistics", (request, response) => {
    UserModel.countDocuments({}, function (error, count) {
        if (error) {
            console.error(log.addMetadata(error.stack, "error"));
        }

        let $ = cheerio.load(fs.readFileSync(__dirname + "/statistics.html"));

        $("#users-registered").text(count.toString());

        response.writeHead(200, { "Content-Type": "text/html" });
        response.end($.html());

        // response.sendFile();
    });
});

app.get("/users", async (request, response) => {
    let $ = cheerio.load(fs.readFileSync(__dirname + "/users.html"));

    let query = mongoDBSanitize.sanitize(url.parse(request.url, true)).query;
    let username = xss(mongoDBSanitize.sanitize(query.username));
    let number = xss(mongoDBSanitize.sanitize(query.number));
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
            data = await UserModel.findOne({ username: username }, function (error, result) {
                if (error) {
                    console.error(log.addMetadata(error.stack, "error"));
                }
                return result;
            });
        }
    } else {
        if (!invalid) {
            data = await UserModel.findOne({ userNumber: number }, function (error, result) {
                if (error) {
                    console.error(log.addMetadata(error.stack, "error"));
                }
                return result;
            });
        }
    }

    // why?
    if (data && !invalid) {
        let statistics = JSON.parse(JSON.stringify(data.statistics));

        let leaderboardRank = await LeaderboardsModel.findOne({ userIDOfHolder: data["_id"] });
        leaderboardRank = JSON.parse(JSON.stringify(leaderboardRank)).rankNumber;

        let rank = calculateRank(data);

        let rankColor = "black";

        rankColor = getRankColor(rank);

        $("#rank").html(rank);
        $("#rank").css("color", rankColor);

        $("#user").html(data.username);

        let creationDateAndTime = data.creationDateAndTime;
        let progressToNextLevelText = 100 * getProgressToNextLevel(statistics.totalExperiencePoints).toFixed(2) + "% to next level";

        if (progressToNextLevelText.indexOf("NaN%") > -1) {
            progressToNextLevelText = "0% to next level";
        }

        $("#player-join-date").html(new Date(creationDateAndTime).toUTCString());

        // personal best
        $("#personal-best-score").html(statistics.personalBestScore);
        $("#global-rank").html(leaderboardRank ? `Global #${leaderboardRank}` : "");

        // experience points
        $("#total-experience-points").html(statistics.totalExperiencePoints);
        $("#current-level").html("Level " + getLevel(statistics.totalExperiencePoints).toString());
        $("#progress-to-next-level").html(progressToNextLevelText);

        response.writeHead(200, { "Content-Type": "text/html" });
        response.end($.html());
    } else {
        $("#user-data").html("Player not found!");
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end($.html());
    }
});

app.get("/privacy-policy", (request, response) => {
    response.sendFile(__dirname + "/privacy-policy.html");
});

app.get("/leaderboards", async (request, response) => {
    let $ = cheerio.load(fs.readFileSync(__dirname + "/leaderboards.html"));

    var allPlayersOnLeaderboardLoaded = false;

    for (var i = 1; i <= 50; i++) {
        var data = await LeaderboardsModel.findOne({ rankNumber: i }, function (error2, result2) {
            return result2;
        });

        data = JSON.parse(JSON.stringify(data));

        var userIDOfHolderAsString = data.userIDOfHolder.toString();

        if ("???" == userIDOfHolderAsString) {
            allPlayersOnLeaderboardLoaded = true;
        }

        if (allPlayersOnLeaderboardLoaded) {
            if (i == 1 || i == 2 || i == 3) {
                $("#rank-" + i + "-username").html("???");
                $("#rank-" + i + "-score").html("???");
            } else {
                $("#leaderboards").append(
                    `<tr>
						<td width="20%" id="rank-number" style="font-size:16px;">
							#
						</td>
						<td class="username-field" id="rank-username" width="40%" style=" font-size:16px; text-align:center;">
							???
						</td>
						<td class="score-field" id="rank-score" width="20%" style="font-size:16px;text-align:right;">
							???
						</td>
					</tr>`
                );

                $("#rank-number").attr("id", "rank-" + i + "-number");
                $("#rank-username").attr("id", "rank-" + i + "-username");
                $("#rank-score").attr("id", "rank-" + i + "-score");

                $("#rank-" + i + "-number").html("#" + i);
                $("#rank-" + i + "-username").html("???");
                $("#rank-" + i + "-score").html("???");
            }
        } else {
            var playerData = await UserModel.findById(data.userIDOfHolder, function (error2, result2) {
                return result2;
            });

            if (i == 1 || i == 2 || i == 3) {
                var playerURL = "users?username=" + playerData.username;
                $("#rank-" + i + "-username").html(`<a href=${playerURL} style="color:${getRankColor(calculateRank(playerData))}">` + playerData.username + "</a>");
                $("#rank-" + i + "-score").html(data.score);
            } else {
                $("#leaderboards").append(
                    `<tr>
						<td width="20%" id="rank-number" style="font-size:16px;">
							#
						</td>
						<td class="username-field" id="rank-username" width="40%" style=" font-size:16px; text-align:center;">
							???
						</td>
						<td class="score-field" id="rank-score" width="20%" style="font-size:16px;text-align:right;">
							???
						</td>
					</tr>`
                );

                $("#rank-number").attr("id", "rank-" + i + "-number");
                $("#rank-username").attr("id", "rank-" + i + "-username");
                $("#rank-score").attr("id", "rank-" + i + "-score");

                var playerURL = "users?username=" + playerData.username;

                $("#rank-" + i + "-number").html("#" + i);
                $("#rank-" + i + "-username").html(`<a href=${playerURL} style="color:${getRankColor(calculateRank(playerData))}">` + playerData.username + "</a>");
                $("#rank-" + i + "-score").html(data.score);
            }
        }
    }

    response.writeHead(200, { "Content-Type": "text/html" });
    response.end($.html());
});

app.get("/confirm-email-address", async (request, response) => {
    let $ = cheerio.load(fs.readFileSync(__dirname + "/confirm-email-address.html"));

    let query = url.parse(request.url, true).query;
    let email = xss(mongoDBSanitize.sanitize(query.email));
    let code = xss(mongoDBSanitize.sanitize(query.code));

    var pendingUserRecord = await PendingUserModel.findOne({
        emailAddress: email,
    });
    if (pendingUserRecord) {
        if (pendingUserRecord["emailConfirmationCode"] == code) {
            let metadataDocument = await MetadataModel.findOne({});
            let stringifiedJSON = JSON.stringify(metadataDocument);
            let object = JSON.parse(stringifiedJSON);
            let userCount = object["usersRegistered"];

            console.log(log.addMetadata("There are " + userCount + " users registered.", "info"));

            let dataToSave = {
                username: pendingUserRecord["username"],
                usernameInAllLowercase: pendingUserRecord["usernameInAllLowercase"],
                emailAddress: pendingUserRecord["emailAddress"],
                hashedPassword: pendingUserRecord["hashedPassword"],
                userNumber: userCount + 1,
                creationDateAndTime: Date.now(),
                statistics: {
                    gamesPlayed: 0,
                },
                membership: {
                    isDeveloper: false,
                    isAdministrator: false,
                    isModerator: false,
                    isContributor: false,
                    isTester: true,
                    isDonator: false,
                    specialRank: "",
                },
            };

            const userModelToSave = new UserModel(dataToSave);

            MetadataModel.findOneAndUpdate({ documentIsMetadata: true }, { $inc: { usersRegistered: 1 } }, { returnOriginal: false, new: true }, (error3, response3) => {
                if (error3) {
                    $("#message").text("Internal error!");
                    console.log(log.addMetadata(error3, "info"));
                    response.writeHead(200, { "Content-Type": "text/html" });
                    response.end($.html());
                    return;
                } else {
                    console.log(log.addMetadata("There are now " + (userCount + 1) + " users registered.", "info"));
                    userModelToSave.save((error4) => {
                        if (error4) {
                            $("#message").text("Internal error!");
                            console.log(log.addMetadata(error4, "info"));
                            response.writeHead(200, { "Content-Type": "text/html" });
                            response.end($.html());
                            return;
                        }
                    });
                }
            });

            console.log(log.addMetadata(`User ${pendingUserRecord["username"]} validated!`, "info"));
            $("#message").text(`User ${pendingUserRecord["username"]} validated! You may now log in!`);

            PendingUserModel.deleteOne({ emailAddress: email }, (error) => {
                if (error) {
                    console.error(log.addMetadata(error.stack, "error"));
                }
            });
        } else {
            console.log(log.addMetadata("Failed to verify a user!", "info"));
            $("#message").text(`Failed to verify the user!`);
        }
    }
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end($.html());
});

app.get("/changelog", async (request, response) => {
    response.sendFile(__dirname + "/changelog.html");
});

app.get("/about", async (request, response) => {
    response.sendFile(__dirname + "/about.html");
});

app.get("/open-source-acknowledgements", async (request, response) => {
    response.sendFile(__dirname + "/open-source-acknowledgements.html");
});

app.get("/forgot-password", async (request, response) => {
    response.sendFile(__dirname + "/forgot-password.html");
});

app.get("/change-password", async (request, response) => {
    let query = url.parse(request.url, true).query;
    let email = xss(mongoDBSanitize.sanitize(query.email));
    let code = xss(mongoDBSanitize.sanitize(query.code));
    var pendingPasswordResetRecord = await PendingPasswordResetModel.findOne({
        emailAddress: email,
    });
    if (pendingPasswordResetRecord) {
        if (pendingPasswordResetRecord["passwordResetConfirmationCode"] == code) {
            response.sendFile(__dirname + "/change-password.html");
        } else {
            response.redirect("/?resetpasswordonpage=fail");
        }
    } else {
        response.redirect("/?resetpasswordonpage=fail");
    }
});

// process registration data
app.post("/register", async (request, response) => {
    const responseKey = xss(request.body["g-recaptcha-response"]);

    const reCaptchaSecretKey = xss(credentials.getReCAPTCHASecretKey());
    const reCaptchaURL = xss(`https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`);

    let desiredUsername = xss(mongoDBSanitize.sanitize(request.body.username));
    let desiredEmail = xss(mongoDBSanitize.sanitize(request.body.email));
    let desiredUsernameInAllLowercase = xss(mongoDBSanitize.sanitize(request.body.username));
    desiredUsernameInAllLowercase = xss(desiredUsernameInAllLowercase.toLowerCase());

    // var usernameIsAvailable1 = await UserModel.findOne({ username: desiredUsername }).select(desiredUsername);
    var emailIsNotAvailable1 = await UserModel.findOne({
        emailAddress: desiredEmail,
    }).select(desiredEmail);
    var usernameIsNotAvailable1 = await UserModel.findOne({
        usernameInAllLowercase: desiredUsernameInAllLowercase,
    }).select(desiredUsernameInAllLowercase);
    var emailIsNotAvailable2 = await PendingUserModel.findOne({
        emailAddress: desiredEmail,
    }).select(desiredEmail);
    var usernameIsNotAvailable2 = await PendingUserModel.findOne({
        usernameInAllLowercase: desiredUsernameInAllLowercase,
    }).select(desiredUsernameInAllLowercase);

    var metadataDocument = await MetadataModel.findOne({});

    fetch(reCaptchaURL, { method: "post" })
        .then((response) => response.json())
        .then((google_response) => {
            if (google_response.success == true) {
                if (usernameIsNotAvailable1 || usernameIsNotAvailable2) {
                    // registration failed - username already taken
                    let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                    $("#error-message").text("Username " + desiredUsername + " already taken!");
                    response.writeHead(200, { "Content-Type": "text/html" });
                    response.end($.html());
                } else {
                    if (!/^[0-9a-zA-Z_]+$/.test(desiredUsername) || desiredUsername.length > 32 || desiredUsername.length < 3 || desiredUsername == "" || desiredUsername == null) {
                        // registration failed - username not valid
                        let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                        $("#error-message").text("Username can only be 3 to 32 characters long and can only contain letters, numbers, or underscores!");
                        response.writeHead(200, { "Content-Type": "text/html" });
                        response.end($.html());
                    } else {
                        if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(desiredEmail) || desiredEmail == "" || desiredEmail == null) {
                            let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                            $("#error-message").text("E-mail address not valid!");
                            response.writeHead(200, { "Content-Type": "text/html" });
                            response.end($.html());
                        } else {
                            if (emailIsNotAvailable1 || emailIsNotAvailable2) {
                                // registration failed - email already taken
                                let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                                $("#error-message").text("E-mail address already taken!");
                                response.writeHead(200, { "Content-Type": "text/html" });
                                response.end($.html());
                            } else {
                                let plaintextPassword = xss(mongoDBSanitize.sanitize(request.body.password));
                                if (plaintextPassword.length < 8 || plaintextPassword.length > 64 || plaintextPassword == "" || plaintextPassword == null || plaintextPassword.includes(" ") || !/^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(plaintextPassword)) {
                                    let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                                    $("#error-message").text("Password invalid!");
                                    response.writeHead(200, { "Content-Type": "text/html" });
                                    response.end($.html());
                                } else {
                                    var hashedPasswordToSave;
                                    bcrypt.genSalt(SALT_ROUNDS, function (error1, salt) {
                                        if (error1) {
                                            let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                                            $("#error-message").text("Internal error!");
                                            console.error(log.addMetadata(error1.stack, "error"));
                                            response.writeHead(200, { "Content-Type": "text/html" });
                                            response.end($.html());
                                        } else {
                                            bcrypt.hash(plaintextPassword, salt, function (error2, hash) {
                                                if (error2) {
                                                    let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                                                    $("#error-message").text("Internal error!");
                                                    console.error(log.addMetadata(error2.stack, "error"));
                                                    response.writeHead(200, {
                                                        "Content-Type": "text/html",
                                                    });
                                                    response.end($.html());
                                                } else {
                                                    hashedPasswordToSave = hash;
                                                    emailConfirmationCode = uuidv4();
                                                    let dataToSave = {
                                                        username: desiredUsername,
                                                        usernameInAllLowercase: desiredUsernameInAllLowercase,
                                                        emailAddress: desiredEmail,
                                                        hashedPassword: hashedPasswordToSave,
                                                        emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}`,
                                                        emailConfirmationCode: emailConfirmationCode,
                                                        expiresAt: new Date(Date.now() + 1800000).getTime(),
                                                    };
                                                    const pendingUserModelToSave = new PendingUserModel(dataToSave);
                                                    pendingUserModelToSave.save((error4) => {
                                                        if (error4) {
                                                            let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                                                            $("#error-message").text("Internal error!");
                                                            console.error(log.addMetadata(error4.stack, "error"));
                                                            response.writeHead(200, {
                                                                "Content-Type": "text/html",
                                                            });
                                                            response.end($.html());
                                                        } else {
                                                            let transporter = nodemailer.createTransport(credentials.getNodemailerOptionsObject());
                                                            let message = {
                                                                from: "Mathematical Base Defenders Support <support@mathematicalbasedefenders.com>",
                                                                to: desiredEmail,
                                                                subject: "Email Confirmation for Mathematical Base Defenders",
                                                                html: `
														<p>
															Thanks for signing up for Mathematical Base Defenders!
															<br>
															In order to fully activate your account, please click the activation link below.
															<br>
															<a href=https://mathematicalbasedefenders.com/confirm-email-address?email=${xss(desiredEmail)}&code=${xss(emailConfirmationCode)}>https://mathematicalbasedefenders.com/confirm-email-address?email=${xss(desiredEmail)}&code=${xss(emailConfirmationCode)}</a>
															<br>
															This link will expire in 30 minutes. After that, your account will be deleted and you may sign up again. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
														</p>
														`,
                                                            };
                                                            transporter.sendMail(message, (error, information) => {
                                                                if (error) {
                                                                    console.error(log.addMetadata(error.stack, "error"));
                                                                    let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                                                                    $("#error-message").text("Internal error!");
                                                                    console.error(log.addMetadata(error4.stack, "error"));
                                                                    response.writeHead(200, {
                                                                        "Content-Type": "text/html",
                                                                    });
                                                                    response.end($.html());
                                                                } else {
                                                                    console.log(log.addMetadata("Successfully sent verification message to " + desiredEmail + "!", "info"));
                                                                    console.log(log.addMetadata("New Unconfirmed User: " + desiredUsername + " (" + desiredEmail + ")", "info"));
                                                                    response.redirect("/?signup=success");
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            } else {
                let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
                $("#error-message").text("Complete the reCAPTCHA first!");
                console.log(log.addMetadata("reCaptcha Error", "info"));
                response.writeHead(200, { "Content-Type": "text/html" });
                response.end($.html());
            }
        });
});

// process password reset request

app.post("/forgot-password", async (request, response) => {
    const responseKey = xss(request.body["g-recaptcha-response"]);
    const reCaptchaSecretKey = xss(credentials.getReCAPTCHASecretKey());
    const reCaptchaURL = xss(`https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`);

    let desiredEmail = xss(mongoDBSanitize.sanitize(request.body.email));
    let passwordResetConfirmationCode = xss(uuidv4());

    fetch(reCaptchaURL, { method: "post" })
        .then((response) => response.json())
        .then((google_response) => {
            if (google_response.success == true) {
                let dataToSave = {
                    emailAddress: desiredEmail,
                    passwordResetConfirmationLink: `https://mathematicalbasedefenders.com/change-password?email=${desiredEmail}&code=${passwordResetConfirmationCode}`,
                    passwordResetConfirmationCode: passwordResetConfirmationCode,
                    expiresAt: new Date(Date.now() + 1800000).getTime(),
                };
                let pendingPasswordResetToSave = new PendingPasswordResetModel(dataToSave);
                pendingPasswordResetToSave.save((error4) => {
                    if (error4) {
                        console.log(log.addMetadata(error4.stack, "info"));
                        response.redirect("/?resetpassword=fail");
                    } else {
                        let transporter = nodemailer.createTransport(credentials.getNodemailerOptionsObject());
                        let message = {
                            from: "Mathematical Base Defenders Support <support@mathematicalbasedefenders.com>",
                            to: desiredEmail,
                            subject: "Password Reset Confirmation for Mathematical Base Defenders",
                            html: `
							<p>
								Someone requested a password reset for your Mathematical Base Defenders account.
								<br>
								If this is you, and you want continue with the procedure, please click this link.
								<br>
								<a href=https://mathematicalbasedefenders.com/change-password/?email={desiredEmail}?code=${xss(passwordResetConfirmationCode)}>https://mathematicalbasedefenders.com/change-password?email=${xss(desiredEmail)}&code=${xss(passwordResetConfirmationCode)}</a>
								<br>
								This link will expire in 30 minutes. After that, you may request a new password reset link. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
							</p>
							`,
                        };
                        transporter.sendMail(message, (error, information) => {
                            if (error) {
                                console.error(log.addMetadata(error.stack, "error"));
                                response.redirect("/?resetpassword=fail");
                            } else {
                                response.redirect("/?resetpassword=success");
                            }
                        });
                    }
                });
            } else {
                response.redirect("/?resetpassword=fail");
            }
        });
});

// process password reset request on page
app.post("/change-password", async (request, response) => {
    let query = url.parse(request.url, true).query;
    let email = xss(mongoDBSanitize.sanitize(query.email));
    let code = xss(mongoDBSanitize.sanitize(query.code));
    let newPassword = xss(mongoDBSanitize.sanitize(request.body.password));
    let confirmNewPassword = xss(mongoDBSanitize.sanitize(request.body["confirm-password"]));

    let record = await PendingPasswordResetModel.find({
        $and: [{ emailAddress: email }, { code: code }],
    });

    if (record) {
        if (!(newPassword.length < 8 || newPassword.length > 64 || newPassword == "" || newPassword == null || newPassword.includes(" ") || !/^[0-9a-zA-Z!"#%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(newPassword) || newPassword != confirmNewPassword)) {
            bcrypt.genSalt(SALT_ROUNDS, function (error1, salt) {
                if (error1) {
                    console.error(log.addMetadata(error1.stack, "error"));
                    response.redirect("/?resetpasswordonpage=fail");
                } else {
                    bcrypt.hash(newPassword, salt, async function (error2, hash) {
                        if (error2) {
                            console.error(log.addMetadata(error2.stack, "error"));
                            response.redirect("/?resetpasswordonpage=fail");
                        } else {
                            PendingPasswordResetModel.deleteOne({ emailAddress: email }, (error3, response3) => {
                                if (error3) {
                                    console.error(log.addMetadata(error3.stack, "error"));
                                    response.redirect("/?resetpasswordonpage=fail");
                                } else {
                                    UserModel.findOneAndUpdate({ emailAddress: email }, { hashedPassword: hash }, { useFindAndModify: true, new: true }, (error, response2) => {
                                        if (error) {
                                            console.error(log.addMetadata(error.stack, "error"));
                                            response.redirect("/?resetpasswordonpage=fail");
                                        } else {
                                            console.log(log.addMetadata("Successfully changed password for a user!", "info"));
                                            response.redirect("/?resetpasswordonpage=success");
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            response.redirect("/?resetpasswordonpage=fail");
        }
    } else {
        response.redirect("/?resetpasswordonpage=fail");
    }
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
    res.status(404).sendFile(__dirname + "/404.html");
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
            fileURL = "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/GAME_CHANGELOG.md";
            break;
        }
        case "website": {
            fileURL = "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/WEBSITE_CHANGELOG.md";
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

// start

app.listen(PORT, () => {
    console.log(log.addMetadata(`App listening at https://localhost:${PORT}`, "info"));
});
