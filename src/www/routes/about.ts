import express, { Request, Response } from "express";
const router = express.Router();
import { log } from "../core/log";
import MarkdownIt from "markdown-it";

const md = MarkdownIt();

router.get("/about", async (request: Request, response: Response) => {
  response.render("pages/about", {
    data: { aboutText: await loadAboutText() }
  });
});

async function loadAboutText() {
  const url =
    "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/ABOUT.md";
  const response = await fetch(url);

  if (!response.ok) {
    log.error(`Failed to load about text! (HTTP ${response.status})`);
    return "Failed to load about text!";
  }

  const text = await response.text();

  return md.render(text);
}

export { router };
