import express from "express";
const router = express.Router();

import * as server from "../server";

router.get(
  "/open-source-acknowledgements",

  async (request, response) => {
    response.render("pages/open-source-acknowledgements", {
      data: server.licenses
    });
  }
);

export { router };
