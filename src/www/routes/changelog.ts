import express from "express";
const router = express.Router();
import { marked } from "marked";
import { log } from "../core/log";

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
  const url = fileURL;
  const response = await fetch(url);

  if (!response.ok) {
    log.error(`Failed to load about text! (HTTP ${response.status})`);
    return "Failed to load about text!";
  }

  const text = await response.text();

  return marked.parse(text);
}

export { router };
