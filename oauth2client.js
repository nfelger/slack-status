const path = require("path");

const { google } = require("googleapis");

const env = process.env.ENV || "development";

const client_id = "46213974342-aas8rl309kots0cp6jtphn20judhdckl.apps.googleusercontent.com";
const client_secret = process.env.GOOGLE_CLIENT_SECRET
const redirect_uris = {
  development: "http://localhost:8888/oauth2callback",
  production: "https://calstat.herokuapp.com/oauth2callback"
};

const oauth2client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[env]
);

module.exports = oauth2client;
