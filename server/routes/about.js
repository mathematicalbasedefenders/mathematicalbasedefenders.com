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

router.get("/about", limiter, async (request, response) => {
  response.render("pages/about", {
    data: { aboutText: md.render(await loadAboutText()) }
  });
});

async function loadAboutText() {
  return new Promise(async (resolve, reject) => {
    let data = "";
    await https.get(
      "https://raw.githubusercontent.com/mathematicalbasedefenders/information/main/ABOUT.md",
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
