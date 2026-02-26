import express from "express";
const router = express.Router();
import MarkdownIt from "markdown-it";

import { log } from "../core/log";

const md = MarkdownIt();

router.get("/privacy-policy", async (request, response) => {
  response.render("pages/privacy-policy", {
    data: { privacyPolicy: await loadPrivacyPolicy() }
  });
});

async function loadPrivacyPolicy() {
  const url =
    "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/PRIVACY_POLICY.md";
  const response = await fetch(url);

  if (!response.ok) {
    log.error(`Failed to load about text! (HTTP ${response.status})`);
    return "Failed to load about text!";
  }

  const text = await response.text();

  return md.render(text);
}
export { router };
