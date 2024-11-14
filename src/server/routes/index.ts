import express from "express";
var router = express.Router();

import rateLimit from "express-rate-limit";
import { log } from "../core/log";
const VERSION_URL = "https://storage.mistertfy64.com/mbd-versions.json";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const PLACEHOLDER_VERSION_DATA = {
  "game": {
    "version": "0.4.11",
    "released": "2024-08-01",
    "releaseDate": "August 1, 2024"
  },
  "website": {
    "version": "0.6.0",
    "released": "2024-11-14",
    "releaseDate": "November 14, 2024"
  }
};

function formatDate(ISODate: string) {
  const dateObject = new Date(ISODate);
  return dateObject.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

async function getVersions() {
  const result = JSON.parse(JSON.stringify(PLACEHOLDER_VERSION_DATA));

  try {
    // get the data
    const response = await fetch(VERSION_URL);
    if (!response.ok) {
      return PLACEHOLDER_VERSION_DATA;
    }

    // response formatting
    const responseJSON = await response.json();
    result.game = responseJSON.game;
    result.website = responseJSON.website;

    // format date
    result.game.releaseDate = formatDate(result.game.released);
    result.website.releaseDate = formatDate(result.website.released);

    return result;
  } catch (error) {
    log.warn("Error on fetching version data.");
    return PLACEHOLDER_VERSION_DATA;
  }
}

router.get("/", limiter, async (request, response) => {
  response.render("pages/index", { versions: await getVersions() });
});

export { router };
