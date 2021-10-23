#!/usr/bin/env nodejs
const http = require("http");
const fs = require("fs");
const querystring = require("querystring");
const url = require("url");
const bcrypt = require("bcrypt");
const cheerio = require("cheerio");
const fetch = require("isomorphic-fetch");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const express = require("express");
const chalk = require("chalk");

const app = express();

const port = 8000;

const saltRounds = 16;

const credentials = require("./credentials/credentials.js");

const uri = credentials.getMongooseURI();

// Color guide:
// Bright Red = Internal error (error)
// Bright Magenta = "User-generated" error

// DON'T FORGET TO CHANGE RECAPTCHA KEYS

// mongoose
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on("connected", () => {
	console.log("Successfully connected to mongoose.");
});

var ObjectId = require("mongoose").Types.ObjectId;

// other stuff
app.use(express.urlencoded({ extended: true }));

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

PendingUserSchema.index({expiresAt: 1},{expireAfterSeconds: 1800});
const PendingUserModel = mongoose.model("PendingUserModel", PendingUserSchema, "pendingUsers");
const UserModel = mongoose.model("UserModel", UserSchema, "users");
const MetadataModel = mongoose.model("IDModel", IDSchema, "metadata");
const LeaderboardsModel = mongoose.model("LeaderboardsModel", LeaderboardsSchema, "leaderboards");

app.use(express.static(__dirname + "/public"));

// pages
app.get("/", (request, response) => {
	response.sendFile(__dirname + "/index.html");
});

app.get("/play", (request, response) => {
	response.sendFile(__dirname + "/play.html");
});

app.get("/download", (request, response) => {
	response.sendFile(__dirname + "/download.html");
});

app.get("/login", (request, response) => {
	response.sendFile(__dirname + "/login.html");
});

app.get("/register", (request, response) => {
	response.sendFile(__dirname + "/register.html");
});

app.get("/statistics", (request, response) => {
	UserModel.countDocuments({}, function (error, count) {
		if (error) {
			console.log(chalk.redBright(error.stack));
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

	let query = url.parse(request.url, true).query;
	let search = query.s;
	let data = await UserModel.findOne({ userNumber: search }, function (error, result) {
		if (error) {
			console.log(chalk.redBright(error.stack));
		}
		return result;
	});

	// why?
	var statistics = JSON.parse(JSON.stringify(data.statistics));

	var rank = beautifyRank(calculateRank(data));

	var rankColor = "black";

	// rank color
	if (rank == "Game Master") {
		rankColor = "#ecc500";
	} else if (rank == "Developer") {
		rankColor = "#ff0000";
	} else if (rank == "Administrator") {
		rankColor = "#da1717";
	} else if (rank == "Moderator") {
		rankColor = "#ff6800";
	} else if (rank == "Contributor") {
		rankColor = "#4070ff";
	} else if (rank == "Tester") {
		rankColor = "#0194ff";
	} else if (rank == "Donator") {
	}

	$("#rank").html(rank);
	$("#rank").css("color", rankColor);

	$("#user").html(data.username);

	$("#player-join-date").html(data.creationDateAndTime);
	$("#personal-best-score").html(statistics.personalBestScore);
	response.writeHead(200, { "Content-Type": "text/html" });
	response.end($.html());
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
				var playerURL = "users?s=" + playerData.userNumber;
				$("#rank-" + i + "-username").html("<a href=" + playerURL + ">" + playerData.username + "</a>");
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

				var playerURL = "users?s=" + playerData.userNumber;

				$("#rank-" + i + "-number").html("#" + i);
				$("#rank-" + i + "-username").html("<a href=" + playerURL + ">" + playerData.username + "</a>");
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
	let email = query.email;
	let code = query.code;

	var pendingUserRecord = await PendingUserModel.findOne({ emailAddress: email });
	if (pendingUserRecord["emailConfirmationCode"] == code) {

		let metadataDocument = await MetadataModel.findOne({ _id: new ObjectId("60eea62aea5b87780e18dc6f") }); // REPLACE THIS WITH 60eea62aea5b87780e18dc6f FOR PRODUCTION
		let stringifiedJSON = JSON.stringify(metadataDocument);
		let object = JSON.parse(stringifiedJSON);
		let userCount = object["usersRegistered"];


		console.log("There are " + userCount + " users registered.");

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
				console.log(error3);
				response.writeHead(200, { "Content-Type": "text/html" });
				response.end($.html());
				return;
			} else {
				console.log("There are now " + (userCount + 1) + " users registered.");
				userModelToSave.save((error4) => {
					if (error4) {
						$("#message").text("Internal error!");
						console.log(error4);
						response.writeHead(200, { "Content-Type": "text/html" });
						response.end($.html());
						return;
					}
				});
			}
		});




		console.log(`User ${pendingUserRecord["username"]} validated!`);
		$("#message").text(`User ${pendingUserRecord["username"]} validated! You may now log in!`);

		PendingUserModel.deleteOne({emailAddress: email}, (error) => {
			if (error){
				console.log(chalk.redBright(error.stack));
			}
		})


	} else {
		console.log(chalk.magentaBright("Failed to verify a user!"));
		$("#message").text(`Failed to verify the user!`);
	}
	response.writeHead(200, { "Content-Type": "text/html" });
	response.end($.html());
});

app.get("/community", async (request, response) => {
	response.sendFile(__dirname + "/community.html");
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

// process registration data
app.post("/register", async (request, response) => {
	const responseKey = request.body["g-recaptcha-response"];

	const reCaptchaSecretKey = credentials.getReCAPTCHASecretKey(); // REPLACE ME!!!!!!!!!!!!!!!!!!!!!!!!!!!!! credentials.getReCAPTCHASecretKey();

	const reCaptchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`;

	let desiredUsername = request.body.username;
	let desiredEmail = request.body.email;
	let desiredUsernameInAllLowercase = request.body.username.toLowerCase();

	// var usernameIsAvailable1 = await UserModel.findOne({ username: desiredUsername }).select(desiredUsername);
	var emailIsNotAvailable1 = await UserModel.findOne({ emailAddress: desiredEmail }).select(desiredEmail);
	var usernameIsNotAvailable1 = await UserModel.findOne({ usernameInAllLowercase: desiredUsernameInAllLowercase }).select(desiredUsernameInAllLowercase);
	var emailIsNotAvailable2 = await PendingUserModel.findOne({ emailAddress: desiredEmail }).select(desiredEmail);
	var usernameIsNotAvailable2 = await PendingUserModel.findOne({ usernameInAllLowercase: desiredUsernameInAllLowercase }).select(desiredUsernameInAllLowercase);

	var metadataDocument = await MetadataModel.findOne({ _id: new ObjectId("60eea62aea5b87780e18dc6f") }); // REPLACE THIS WITH 60eea62aea5b87780e18dc6f FOR PRODUCTION

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


								let plaintextPassword = request.body.password;
								if (
									plaintextPassword.length < 8 ||
									plaintextPassword.length > 256 ||
									plaintextPassword == "" ||
									plaintextPassword == null ||
									plaintextPassword.includes(" ") ||
									!/^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(plaintextPassword)
								) {
									let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
									$("#error-message").text("Password invalid!");
									response.writeHead(200, { "Content-Type": "text/html" });
									response.end($.html());
								} else {
									var hashedPasswordToSave;
									bcrypt.genSalt(saltRounds, function (error1, salt) {
										if (error1) {
											let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
											$("#error-message").text("Internal error!");
											console.log(chalk.redBright(error1.stack));
											response.writeHead(200, { "Content-Type": "text/html" });
											response.end($.html());
										} else {
											bcrypt.hash(plaintextPassword, salt, function (error2, hash) {
												if (error2) {
													let $ = cheerio.load(fs.readFileSync(__dirname + "/registration-failed.html"));
													$("#error-message").text("Internal error!");
													console.log(chalk.redBright(error2.stack));
													response.writeHead(200, { "Content-Type": "text/html" });
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
															console.log(chalk.redBright(error4.stack));
															response.writeHead(200, { "Content-Type": "text/html" });
															response.end($.html());
														} else {
															console.log("New Unconfirmed User: " + desiredUsername + " (" + desiredEmail + ")");
															response.redirect("/");
														}
													});
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
															<a href=https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}>https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}</a>
															<br>
															This link will expire in 30 minutes. After that, your account will be deleted and you may sign up again. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
														</p>
														`,
													};
													transporter.sendMail(message, (error, information) => {
														if (error) {
															console.log(chalk.redBright(error.stack));
														} else {
															console.log("Successfully sent verification message to " + desiredEmail + "!");
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
				console.log(chalk.magentaBright("reCaptcha Error"));
				response.writeHead(200, { "Content-Type": "text/html" });
				response.end($.html());
			}
		});
});

// other functions

function calculateRank(data) {
	if (data.username == "mistertfy64") {
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

function beautifyRank(rank) {
	return rank;
}

// start

app.listen(port, () => {
	console.log(`App listening at http://localhost:${port}`);
});
