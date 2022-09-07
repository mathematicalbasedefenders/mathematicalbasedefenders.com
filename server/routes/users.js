var router = require("express").Router();

const _ = require("lodash");
const mongoDBSanitize = require("express-mongo-sanitize");
const url = require("url");

const { JSDOM } = require("jsdom");
const defaultWindow = new JSDOM("").window;
const createDOMPurify = require("dompurify");
const DOMPurify = createDOMPurify(defaultWindow);
const axios = require("axios");
const log = require("../core/log.js");
const utilities = require("../core/utilities.js");
const configuration = require("../core/configuration.js");
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
});

var User = require("../models/User.js");
var EasyModeLeaderboardsRecord = require("../models/EasyModeLeaderboardsRecord.js");
var StandardModeLeaderboardsRecord = require("../models/StandardModeLeaderboardsRecord.js");

const RANK_DESCRIPTIONS = {
	"Game Master": "This user created and has full control over Mathematical Base Defenders.",
	Administrator: "This user has almost full control over Mathematical Base Defenders.",
	Moderator: "This user can assign punishments to users.",
	Contributor: "This user helped with the development of Mathematical Base Defenders, but isn't part of the development team.",
	Tester: "This user helped to test features of Mathematical Base Defenders, but isn't part of the development team.",
	Donator: "This user has supported Mathematical Base Defenders financially.",
};

router.get("/users/:user", limiter, async (request, response) => {
	let originalData = await validateQuery(request.params.user, request);
	originalData = originalData.data;
	if (originalData) {
		let data = await getUserData(originalData);
		response.render("pages/users", {
			data: data,
		});
	} else {
		response.render("pages/not-found");
	}
});

async function validateQuery(user, request) {
	let data;

	if (!(/[A-Za-z0-9_]{3,20}/.test(user) || /[0-9a-f]{24}/.test(user))) {
		return false;
	}
	try {
		data = await axios.get(`${request.protocol == "http" && configuration.configuration.autoHTTPSOnAPICalls ? "https" : request.protocol}://${request.get("Host")}/api/users/${user}`);
		data = JSON.parse(JSON.stringify(data));
	} catch (error) {
		return false;
	}

	return data;
}

async function getUserData(data, invalid = false) {
	// why?

	if (data && !invalid) {
		data = _.cloneDeep(data);
		let easyModeLeaderboardRank = await EasyModeLeaderboardsRecord.findOne({
			userIDOfHolder: data["_id"],
		}).clone();
		let standardModeLeaderboardRank = await StandardModeLeaderboardsRecord.findOne({
			userIDOfHolder: data["_id"],
		}).clone();

		if (easyModeLeaderboardRank) {
			easyModeLeaderboardRank = JSON.parse(JSON.stringify(easyModeLeaderboardRank)).rankNumber;
		}
		if (standardModeLeaderboardRank) {
			standardModeLeaderboardRank = JSON.parse(JSON.stringify(standardModeLeaderboardRank)).rankNumber;
		}

		data.rank = utilities.calculateRank(data);
		data.rankColor = utilities.getRankColor(utilities.calculateRank(data));
		data.emailAddress = "";
		data.hashedPassword = "";
		data.statistics.easyModeLeaderboardRank = easyModeLeaderboardRank;
		data.statistics.standardModeLeaderboardRank = standardModeLeaderboardRank;
		data.statistics.currentLevel = `${utilities.getLevel(data.statistics.totalExperiencePoints)}`;
		data.statistics.progressToNextLevelInPercentage = `${parseFloat((utilities.getProgressToNextLevel(data.statistics.totalExperiencePoints) * 100).toFixed(3)).toString()}%`;
		if (data.username === "mistertfy64") {
			data.rankDescription = RANK_DESCRIPTIONS["Game Master"];
		} else {
			data.rankDescription = data.rank.toString() in RANK_DESCRIPTIONS ? RANK_DESCRIPTIONS[data.rank.toString()] : "This user is a normal player.";
		}
	}
	data.statistics.multiplayerWinRate = data.statistics?.multiplayer?.gamesWon / data.statistics?.multiplayer?.gamesPlayed;
	if (data.statistics?.multiplayer?.gamesPlayed) {
		
		if (data.statistics?.multiplayer?.gamesWon){
		data.statistics.primaryMultiplayerWinRateMessage = `${(data.statistics.multiplayerWinRate * 100).toFixed(3)}% win rate`;
		} else {
			data.statistics.primaryMultiplayerWinRateMessage = `0.000% win rate`;
		}
	
	} else {
		data.statistics.primaryMultiplayerWinRateMessage = "N/A";
	}

	if (data.statistics?.multiplayer?.gamesPlayed){
		if (data.statistics?.multiplayer?.gamesWon === 0 || !(data.statistics?.multiplayer?.gamesWon)){
			data.statistics.secondaryMultiplayerWinRateMessage = `Player played at least one multiplayer game, but hasn't won any yet.`;
		} else {
			data.statistics.secondaryMultiplayerWinRateMessage =  `Won 1 multiplayer game every ${data.statistics.multiplayer.gamesPlayed / data.statistics.multiplayer.gamesWon} multiplayer games played.`;
		}
	} else {
		data.statistics.secondaryMultiplayerWinRateMessage ="Player has not played a multiplayer game yet.";
		}	return data;
}

module.exports = router;
