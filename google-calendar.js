const { google } = require("googleapis");

const oauth2client = require("./oauth2client");

google.options({auth: oauth2client});

function getCurrentEvents(lookahead) {
  const events = new Promise((resolve, reject) => {
    const calendar = google.calendar({ version: "v3" });
    const timeMin = new Date().toISOString();
    // Add 1sec because timeMax is exclusive.
    const timeMax = new Date(new Date().getTime() + lookahead + 1000).toISOString();

    calendar.events.list(
      {
        calendarId: "primary",
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: "startTime",
      },
      (err, res) => {
        if (err) return reject("The API returned an error: " + err);

        resolve(res.data.items);
      }
    );
  });

  return events;
}

function generateAuthorizeUrl(userId) {
  const scopes = ["https://www.googleapis.com/auth/calendar.readonly"];

  return oauth2client.generateAuthUrl({
    access_type: "offline",
    scope: scopes.join(" "),
    state: userId,
    // Force issuing a refresh token each time (important while Google app is in "testing" mode).
    prompt: "consent"
  });
}

async function setAndVerifyOAuthToken(tokens) {
  oauth2client.setCredentials(tokens);

  try {
    // Attempt a request
    const calendar = google.calendar({ version: "v3" });
    await calendar.events.list({ calendarId: 'primary' });

  } catch (err) {
    console.log("Error verifying Google OAuth token:", err);
    return false;
  }

  return true;
}

module.exports = {
  generateAuthorizeUrl,
  getCurrentEvents,
  setAndVerifyOAuthToken,
}
