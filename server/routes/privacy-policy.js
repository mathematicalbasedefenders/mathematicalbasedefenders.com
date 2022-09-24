var router = require("express").Router();
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
const https = require("https");
const marked = require("marked");
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt({ html: true });

router.get("/privacy-policy", limiter, async (request, response) => {
  response.render("pages/privacy-policy", {
    data: { privacyPolicy: md.render(await loadPrivacyPolicy()) }
  });
});
async function loadPrivacyPolicy() {
  return new Promise(async (resolve, reject) => {
    let data = "";
    await https.get(
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
module.exports = router;
