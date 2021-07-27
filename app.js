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

const express = require("express");
const app = express();

const port = 8000;

const saltRounds = 16;

const uri = "mongodb+srv://mbddatabase:xpUtcPZz5LyEAq4FASU88932uJIFSNcnoASIUOFhwoiAHfiIOFHi8932@cluster1.6bi0m.mongodb.net/database1?retryWrites=true&w=majority";

// DON'T FORGET TO CHANGE RECAPTCHA KEYS

// mongoose
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on("connected", () => {
	console.log("Successfully connected to mongoose.");
});

var ObjectId = require("mongoose").Types.ObjectId;

// other stuff
app.use(express.urlencoded());

const UserModelSchema = new Schema({
	username: String,
	usernameInAllLowercase: String,
	email: String,
	hashedPassword: String,
	userNumber: Number,
	creationTime: {
		type: Date,
		default: Date.now(),
	},
	statistics: {
		gamesPlayed: Number,
	},
	membership: {
		isAdministrator: Boolean,
		isModerator: Boolean,
		isContributor: Boolean,
		isTester: Boolean,
		isDonator: Boolean,
	},
});

const IDSchema = new Schema({
	_id: mongoose.Schema.Types.ObjectId,
	usersRegistered: Number,
});

const LeaderboardsSchema = new Schema({
	_id: mongoose.Schema.Types.ObjectId,
	rank1ID: String,
	rank1Score: Number,
	rank2ID: String,
	rank2Score: Number,
	rank3ID: String,
	rank3Score: Number,
	rank4ID: String,
	rank4Score: Number,
	rank5ID: String,
	rank5Score: Number,
	rank6ID: String,
	rank6Score: Number,
	rank7ID: String,
	rank7Score: Number,
	rank8ID: String,
	rank8Score: Number,
	rank9ID: String,
	rank9Score: Number,
	rank10ID: String,
	rank10Score: Number,
});

const UserModel = mongoose.model("UserModel", UserModelSchema, "users");

const IDModel = mongoose.model("IDModel", IDSchema, "metadata");

const LeaderboardsModel = mongoose.model("LeaderboardsModel", LeaderboardsSchema, "leaderboards");

app.use(express.static(__dirname + "/public"));

// pages
app.get("/", (request, response) => {
	response.sendFile(__dirname + "/index.html");
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
			console.log(error);
		}
		console.log("There are " + count + " users registered.");

		let $ = cheerio.load(fs.readFileSync(__dirname + "/statistics.html"));

		$("#users-registered").text(count.toString());

		response.writeHead(200, { "Content-Type": "text/html" });
		response.end($.html());

		// response.sendFile();
	});
});

app.get("/users", (request, response) => {
	var query = url.parse(request.url, true).query;
	var search = query.s;
	UserModel.findOne({ userNumber: search }, function (error, result) {
		if (error) {
			console.log(error);
		}
		console.log(result == null ? "User #" + search + " doesn't exist yet! There are only " + count + " users registered." : "User #" + search + " is " + result.username + ".");
	});
});

app.get("/privacy-policy", (request, response) => {
	response.sendFile(__dirname + "/privacy-policy.html");
});

app.get("/leaderboards", async (request, response) => {
	let $ = cheerio.load(fs.readFileSync(__dirname + "/leaderboards.html"));

	var allPlayersOnLeaderboardLoaded = false;

	var usernames = {};
	var scores = {};
	var usernameDOMIDs = {};
	var scoreDOMIDs = {};

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

				$("#rank-" + i + "-number").html("#"+i);
				$("#rank-" + i + "-username").html("???");
				$("#rank-" + i + "-score").html("???");
			}
		} else {
			var playerData = await UserModel.findById(data.userIDOfHolder, function (error2, result2) {
				return result2;
			});

			if (i == 1 || i == 2 || i == 3) {
				$("#rank-" + i + "-username").html(playerData.username);
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

				$("#rank-" + i + "-number").html("#" + i);
				$("#rank-" + i + "-username").html(playerData.username);
				$("#rank-" + i + "-score").html(data.score);
			}
		}
	}

	response.writeHead(200, { "Content-Type": "text/html" });
	response.end($.html());
});

// process registration data
app.post("/register", async (request, response) => {
	const responseKey = request.body["g-recaptcha-response"];

	const reCaptchaSecretKey = "6LdEsX0bAAAAAI_Il7uNIXIVKIcO9gQEmOrp46oT";

	const reCaptchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`;

	let desiredUsername = request.body.username;
	let desiredEmail = request.body.email;
	let desiredUsernameInAllLowercase = request.body.username.toLowerCase();

	var result1 = await UserModel.findOne({ username: desiredUsername }).select(desiredUsername).lean();
	var result2 = await UserModel.findOne({ email: desiredEmail }).select(desiredEmail).lean();
	var result11 = await UserModel.findOne({ usernameInAllLowercase: desiredUsernameInAllLowercase }).select(desiredUsernameInAllLowercase).lean();
	var metadata = await IDModel.findOne({ _id: new ObjectId("60eea62aea5b87780e18dc6f") });
	fetch(reCaptchaURL, { method: "post" })
		.then((response) => response.json())
		.then((google_response) => {
			if (google_response.success == true) {
				if (result1 || result11) {
					// registration failed - username already taken
					let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
					$("#error-message").text("Username " + desiredUsername + " already taken!");
					response.writeHead(200, { "Content-Type": "text/html" });
					response.end($.html());
				} else {
					if (!/^[0-9a-zA-Z_]+$/.test(desiredUsername) || desiredUsername.length > 32 || desiredUsername.length < 3 || desiredUsername == "" || desiredUsername == null) {
						// registration failed - username not valid
						let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
						$("#error-message").text("Username can only be 3 to 32 characters long and can only contain letters, numbers, or underscores!");
						response.writeHead(200, { "Content-Type": "text/html" });
						response.end($.html());
					} else {
						if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(desiredEmail) || desiredEmail == "" || desiredEmail == null) {
							let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
							$("#error-message").text("E-mail address not valid!");
							response.writeHead(200, { "Content-Type": "text/html" });
							response.end($.html());
						} else {
							console.log(result2);
							if (result2) {
								// registration failed - email already taken
								let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
								$("#error-message").text("E-mail address already taken!");
								response.writeHead(200, { "Content-Type": "text/html" });
								response.end($.html());
							} else {
								var stringifiedJSON = JSON.stringify(metadata);
								var object = JSON.parse(stringifiedJSON);

								var userCount = object["usersRegistered"];

								console.log("There are " + userCount + " users registered.");

								let plaintextPassword = request.body.password;
								if (plaintextPassword.length < 8 || plaintextPassword.length > 256 || plaintextPassword == "" || plaintextPassword == null || plaintextPassword.includes(" ") || !/^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(plaintextPassword)) {
									let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
									$("#error-message").text("Password invalid!");
									response.writeHead(200, { "Content-Type": "text/html" });
									response.end($.html());
								} else {
									var hashedPasswordToSave;
									bcrypt.genSalt(saltRounds, function (error1, salt) {
										if (error1) {
											let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
											$("#error-message").text("Internal error!");
											console.log(error1);
											response.writeHead(200, { "Content-Type": "text/html" });
											response.end($.html());
										} else {
											bcrypt.hash(plaintextPassword, salt, function (error2, hash) {
												if (error2) {
													let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
													$("#error-message").text("Internal error!");
													console.log(error2);
													response.writeHead(200, { "Content-Type": "text/html" });
													response.end($.html());
												} else {
													hashedPasswordToSave = hash;
													let dataToSave = {
														username: desiredUsername,
														usernameInAllLowercase: desiredUsernameInAllLowercase,
														email: desiredEmail,
														hashedPassword: hashedPasswordToSave,
														userNumber: userCount + 1,
														creationTime: Date.now(),
														statistics: {
															gamesPlayed: 0,
														},
														membership: {
															isAdministrator: false,
															isModerator: false,
															isContributor: false,
															isTester: true,
															isDonator: false,
														},
													};

													const userModelToSave = new UserModel(dataToSave);

													IDModel.findOneAndUpdate({ documentIsMetadata: true }, { $inc: { usersRegistered: 1 } }, { returnOriginal: false, new: true }, (error3, response3) => {
														if (error3) {
															let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
															$("#error-message").text("Internal error!");
															console.log(error3);
															response.writeHead(200, { "Content-Type": "text/html" });
															response.end($.html());
														} else {
															console.log("There are now " + (userCount + 1) + " users registered.");
															userModelToSave.save((error4) => {
																if (error4) {
																	let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
																	$("#error-message").text("Internal error!");
																	console.log(error4);
																	response.writeHead(200, { "Content-Type": "text/html" });
																	response.end($.html());
																} else {
																	console.log("New User: " + desiredUsername + " (" + desiredEmail + ")");
																	response.redirect("/");
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
				let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
				$("#error-message").text("Complete the reCAPTCHA first!");
				console.log(reCAPTCHAError);
				response.writeHead(200, { "Content-Type": "text/html" });
				response.end($.html());
			}
		})
		.catch((reCAPTCHAError) => {
			let $ = cheerio.load(fs.readFileSync(__dirname + "/registrationfailed.html"));
			$("#error-message").text("Internal error!");
			console.log(reCAPTCHAError);
			response.writeHead(200, { "Content-Type": "text/html" });
			response.end($.html());
		});
});

// start

app.listen(port, () => {
	console.log(`App listening at http://localhost:${port}`);
});
