import express from "express";
var router = express.Router();

import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/register", limiter, (request, response) => {
  response.render("pages/register");
});

export { router };
