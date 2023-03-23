import express from "express";
var router = express.Router();
const fetch = require("node-fetch");
import rateLimit from "express-rate-limit";
import _ from "lodash";
import { getScoresOfTopPlayers } from "../services/leaderboards";
import { User } from "../models/User";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/leaderboards", limiter, async (request, response) => {
  response.redirect("/leaderboards/standard");
});

router.get("/leaderboards/:mode", limiter, async (request, response) => {
  if (request.params.mode !== "easy" && request.params.mode !== "standard") {
    return;
  }
  let data = await fetch(
    `${request.protocol}://${request.get("Host")}/api/leaderboards/${
      request.params.mode
    }`
  );
  data = await data.json();
  let mode = _.startCase(request.params.mode);
  response.render("pages/leaderboards", { data: data, mode: mode });
});

export { router };
