import express from "express";
const router = express.Router();

import https from "https";
import { marked } from "marked";
import { log } from "../core/log";

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

  return marked.parse(text);
}
export { router };
