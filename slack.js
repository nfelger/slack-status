const { App } = require("@slack/bolt");

const userApp = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_USER_TOKEN,
});

async function getStatus() {
  return userApp.client.users.profile.get().then(({ profile }) => {
    const { status_text: text, status_emoji: emoji } = profile;
    return { text, emoji };
  });
}

async function setStatus(text, emoji) {
  await userApp.client.users.profile.set({
    profile: {
      status_text: text,
      status_emoji: emoji,
      status_expiration: 0,
    },
  });
}

const botApp = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

async function postMessage(channel, message) {
  await botApp.client.chat.postMessage({
    channel: channel,
    text: message
  });
}

module.exports = {
  getStatus,
  setStatus,
  postMessage,
}
