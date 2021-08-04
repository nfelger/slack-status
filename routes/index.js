const path = require("path");
const url = require("url");
const util = require("util");

const oauth2client = require("../oauth2client");
const redis = require("../redis");

const express = require("express");
const router = express.Router();

router.get("/oauth2callback", async (req, res, next) => {
  const queryParams = new url.URL(req.url, "http://localhost:3000")
    .searchParams;
  const code = queryParams.get("code");
  const slackUserId = queryParams.get("state");
  const { tokens } = await oauth2client.getToken(code);
  await redis.set(`google-token-${slackUserId}`, JSON.stringify(tokens));
  res.render("oauth2callback", { tokens: util.inspect(tokens) });
});

module.exports = router;
