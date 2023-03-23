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

router.get("/privacy-policy", limiter, async (request, response) => {
  response.render("pages/privacy-policy", {
    data: { privacyPolicy: marked.parse((await loadPrivacyPolicy()) as string) }
  });
});
async function loadPrivacyPolicy() {
  return new Promise(async (resolve, reject) => {
    let data = "";
    https.get(
      "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/PRIVACY_POLICY.md",
      (response) => {
        response.on("data", (chunk) => {
          data += chunk.toString("utf-8");
        });
        response.on("end", function () {
          resolve(marked.parse(data));
        });
      }
    );
  });
}
export { router };
