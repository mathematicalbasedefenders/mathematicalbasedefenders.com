var router = require("express").Router();
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const EasyModeLeaderboardsRecord = require("../models/EasyModeLeaderboardsRecord.js");
const StandardModeLeaderboardsRecord = require("../models/StandardModeLeaderboardsRecord.js");

router.get("/api/leaderboards/:mode", limiter, async (request, response) => {
    let model;
    switch (request.params.mode) {
        case "easy": {
            model = EasyModeLeaderboardsRecord;
            break;
        }
        case "standard": {
            model = StandardModeLeaderboardsRecord;
            break;
        }
        default: {
            response.status(404).json("Mode does not exist.");
            return;
            break;
        }
    }
    let data = await model.find({rankNumber: { $lt: 51 }}).clone();
    response.status(200).json(data);
});

module.exports = router;