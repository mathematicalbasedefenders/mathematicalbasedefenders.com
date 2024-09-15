import express from "express";
var router = express.Router();

import rateLimit from "express-rate-limit";
const VERSION_URL = "https://storage.mistertfy64.com/mbd-versions.json";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const PLACEHOLDER_VERSION_DATA = {
  "game": {
    "version": "0.4.11",
    "released": "2024-08-01",
    "releaseDate": "August 1, 2024"
  },
  "website": {
    "version": "0.5.10",
    "released": "2024-06-03",
    "releaseDate": "June 3, 2024"
  }
};

function formatDate(ISODate: string) {
  const dateObject = new Date(ISODate);
  const m = MONTHS[dateObject.getMonth()];
  const d = dateObject.getDate();
  const y = dateObject.getFullYear();
  return `${m} ${d}, ${y}`;
}

async function getVersions() {
  const result = PLACEHOLDER_VERSION_DATA;

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
}

router.get("/", limiter, async (request, response) => {
  response.render("pages/index", { versions: await getVersions() });
});

export { router };
