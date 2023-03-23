import express from "express";
var router = express.Router();
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
import * as server from "../../server";

router.get(
  "/open-source-acknowledgements",
  limiter,
  async (request, response) => {
    response.render("pages/open-source-acknowledgements", {
      data: server.licenses
    });
  }
);

export { router };
