import express from "express";
const router = express.Router();

import https from "https";
import { marked } from "marked";

interface ChangelogContent {
  text: string;
  part: string;
}

router.get("/changelog", async (request, response) => {
  response.redirect("/changelog/game");
});

router.get("/changelog/:service", async (request, response) => {
  let data = <ChangelogContent>{};
  // data.gameChangelog = marked.parse((await loadText("game")) as string);
  switch (request.params.service) {
    case "website": {
      data.text = marked.parse((await loadText("website")) as string);
      data.part = "Website";
      response.render("pages/changelog", { data: data });
      return;
    }
    case "game": {
      data.text = marked.parse((await loadText("game")) as string);
      data.part = "Game";
      response.render("pages/changelog", { data: data });
      return;
    }
    default: {
      response.redirect("/changelog/game");
      return;
    }
  }
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
