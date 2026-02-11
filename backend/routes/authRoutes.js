const express = require("express");
const { google } = require("googleapis");
const { createOAuthClient, SCOPES } = require("../config/googleConfig");

const router = express.Router();

function buildPopupResponse(res, payload) {
  const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
  const safePayload = JSON.stringify(payload || {});
  res.setHeader("Content-Type", "text/html");
  res.send(`<!doctype html>
<html>
  <body>
    <script>
      (function () {
        const payload = ${safePayload};
        if (window.opener) {
          window.opener.postMessage({ type: "gmail-auth", ...payload }, "${frontend}");
        }
        window.close();
      })();
    </script>
    <p>You may close this window.</p>
  </body>
</html>`);
}

router.get("/google", (req, res) => {
  try {
    const client = createOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES
    });
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) {
      return buildPopupResponse(res, { success: false, error: "Login cancelled." });
    }
    if (!code) {
      return buildPopupResponse(res, { success: false, error: "Missing authorization code." });
    }

    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data } = await oauth2.userinfo.get();

    req.session.googleTokens = tokens;
    req.session.googleEmail = data.email;

    buildPopupResponse(res, { success: true, email: data.email });
  } catch (err) {
    buildPopupResponse(res, { success: false, error: err.message });
  }
});

router.get("/status", (req, res) => {
  const tokens = req.session?.googleTokens;
  if (!tokens) return res.json({ authenticated: false });
  res.json({ authenticated: true, email: req.session.googleEmail || "" });
});

router.post("/logout", (req, res) => {
  req.session.googleTokens = null;
  req.session.googleEmail = null;
  res.json({ message: "Logged out" });
});

module.exports = router;
