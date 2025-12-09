import express, { Request, Response } from "express";
const router = express.Router();

import https from "https";
import { marked } from "marked";

router.get("/about", async (request: Request, response: Response) => {
  response.render("pages/about", {
    data: { aboutText: marked.parse((await loadAboutText()) as string) }
  });
});

async function loadAboutText() {
  return new Promise(async (resolve, reject) => {
    let data = "";
    https.get(
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

export { router };
