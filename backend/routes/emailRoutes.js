const express = require("express");
const { sendGmailMessage } = require("../utils/gmailService");

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { to, subject, body, html } = req.body;
    if (!to || !subject || (!body && !html)) {
      return res.status(400).json({ error: "to, subject, and body/html are required" });
    }
    await sendGmailMessage(req, {
      to,
      subject,
      html: html || null,
      text: body || null
    });
    res.json({ message: "Email sent" });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
