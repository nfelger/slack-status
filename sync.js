const util = require("util");

const { DateTime } = require ("luxon");

const gcal = require("./google-calendar")
const redis = require("./redis");
const slack = require("./slack")

// it me
const userId = "U01EDMJSNK0";

async function loadTokens(userId) {
  const tokensJson = await redis.get(`google-token-${userId}`);
  if (!tokensJson) return null;

  return JSON.parse(tokensJson);
}

async function requestAuthorizationFromUser(userId) {
  const authorizeUrl = gcal.generateAuthorizeUrl(userId);
  await slack.postMessage(userId, `Please (re-)authorize access to your Google Calendar here: ${authorizeUrl}`);
}

const atWorkStatus = { emoji: ":wave:", text: "" };
const offWorkStatus = { emoji: ":skateboard:", text: "currently off work" };

function statusToTransitionKey(status) {
  return `${status.emoji}${status.text}`;
}

async function getStatusFromCalendarEvents() {
  // Sync runs every 10min on Heroku, so peek ahead 5min.
  const events = await gcal.getCurrentEvents(5 * 60 * 1000);
  if (
    events.some((event) => {
      return event.eventType === "outOfOffice";
    })
  ) {
    return "off-work";
  } else {
    return "at-work";
  }
}

function getStatusFromWorkingHours() {
  const start = DateTime.fromObject({ hour: 8, minute: 45 }, { zone: 'Europe/Berlin' });
  const end = DateTime.fromObject({ hour: 18, minute: 0 }, { zone: 'Europe/Berlin' });
  const now = DateTime.now();

  return (now >= start && now <= end) ? 'at-work' : 'off-work'
}

const transitions = {
  [statusToTransitionKey(atWorkStatus)]: {
    "off-work": offWorkStatus,
  },
  [statusToTransitionKey(offWorkStatus)]: {
    "at-work": atWorkStatus,
  },
};

(async () => {
  console.log("Checking whether we have a Google token and whether it's valid.");
  const tokens = await loadTokens(userId);
  let hasValidToken;
  if (tokens) {
    hasValidToken = await gcal.setAndVerifyOAuthToken(tokens);
  }
  if (!tokens || !hasValidToken) {
    console.log("No token or token invalid. Asking user to (re-)authorize.");
    await requestAuthorizationFromUser(userId);
    console.log("Exiting.");
    process.exit(1);
  } else {
    console.log("Token seems valid.");
  }

  console.log("Getting current user Slack status.");
  const status = await slack.getStatus();
  console.log(`-> ${util.inspect(status)}`);
  console.log("Checking user calender for what the status should be.");
  const calendarStatus = await getStatusFromCalendarEvents();
  console.log(`-> ${util.inspect(calendarStatus)}`);
  console.log("Comparing current time with working hours.");
  const hoursStatus = getStatusFromWorkingHours();
  console.log(`-> ${util.inspect(hoursStatus)}`);
  let workStatus = 'at-work';
  if (calendarStatus === 'off-work' || hoursStatus === 'off-work') {
    workStatus = 'off-work';
  }

  console.log("Checking if we have a transition for that.");
  const statusKey = statusToTransitionKey(status);
  if (transitions[statusKey] && transitions[statusKey][workStatus]) {
    console.log("Transition exists. Transitioning...");
    const newStatus = transitions[statusKey][workStatus];
    await slack.setStatus(newStatus.text, newStatus.emoji);
    console.log(`Changed status to: ${util.inspect(newStatus)}`);
  } else {
    console.log("Nothing to do.");
  }

  process.exit(0);
})();
