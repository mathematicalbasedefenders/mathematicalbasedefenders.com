import express from "express";
const router = express.Router();
import MarkdownIt from "markdown-it";
import { log } from "../core/log";

const md = MarkdownIt();

interface ChangelogContent {
  text: string;
  part: string;
}

router.get("/changelog", async (request, response) => {
  response.redirect("/changelog/game");
});

router.get("/changelog/:service", async (request, response) => {
  let data = <ChangelogContent>{};
  switch (request.params.service) {
    case "website": {
      data.text = md.render((await loadText("website")) as string);
      data.part = "Website";
      response.render("pages/changelog", { data: data });
      return;
    }
    case "game": {
      data.text = md.render((await loadText("game")) as string);
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

  return text;
}

export { router };
