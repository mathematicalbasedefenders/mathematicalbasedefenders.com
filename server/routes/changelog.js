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
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({html:true});

router.get("/changelog", limiter,async(request, response) => {
    let data = {}
    data.gameChangelog = md.render(await loadText("game"));
    data.websiteChangelog = md.render(await loadText("website"));   
    response.render("pages/changelog", {data: data});
});

async function loadText(service) {
    let fileURL;
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

module.exports = router;