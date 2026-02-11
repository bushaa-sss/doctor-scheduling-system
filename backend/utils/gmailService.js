const { google } = require("googleapis");
const { createOAuthClient } = require("../config/googleConfig");

function encodeMessage(message) {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRawMessage({ from, to, subject, html, text }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0"
  ];

  if (html) {
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 7bit", "", html);
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 7bit", "", text || "");
  }

  return encodeMessage(lines.join("\r\n"));
}

async function getAuthorizedClient(req) {
  const tokens = req.session?.googleTokens;
  if (!tokens) {
    const err = new Error("Google account not connected.");
    err.status = 401;
    throw err;
  }

  const client = createOAuthClient();
  client.setCredentials(tokens);

  try {
    const accessToken = await client.getAccessToken();
    if (!accessToken?.token) {
      const err = new Error("Access token expired. Please reconnect Google account.");
      err.status = 401;
      throw err;
    }
  } catch (err) {
    err.status = err.status || 401;
    throw err;
  }

  req.session.googleTokens = { ...client.credentials };
  return client;
}

async function sendGmailMessage(req, { to, subject, html, text }) {
  const client = await getAuthorizedClient(req);
  const gmail = google.gmail({ version: "v1", auth: client });
  const from = req.session.googleEmail || "me";

  const raw = buildRawMessage({ from, to, subject, html, text });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw
    }
  });
}

module.exports = {
  getAuthorizedClient,
  sendGmailMessage
};
