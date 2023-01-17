import express from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
import https from "https";
import { marked } from "marked";

interface ChangelogContent {
  gameChangelog: any;
  websiteChangelog: any;
}

router.get("/changelog", limiter, async (request, response) => {
  let data = <ChangelogContent>{};
  data.gameChangelog = marked.parse((await loadText("game")) as string);
  data.websiteChangelog = marked.parse((await loadText("website")) as string);
  response.render("pages/changelog", { data: data });
});

async function loadText(service: string) {
  let fileURL: string;
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

export { router };
