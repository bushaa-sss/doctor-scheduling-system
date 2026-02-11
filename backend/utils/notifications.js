const webpush = require("web-push");

let isConfigured = false;

// Initialize Web Push with VAPID keys from env
function configureVapid() {
  if (isConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  // if (!publicKey || !privateKey) {
  //   console.warn("VAPID keys missing. Push notifications disabled.");
  //   return;
  // }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
}

// Send notification if the doctor has a subscription
async function notifyDoctor(doctor, payload) {
  configureVapid();
  if (!isConfigured) return;
  if (!doctor || !doctor.pushSubscription) return;

  const body = JSON.stringify(payload);

  try {
    await webpush.sendNotification(doctor.pushSubscription, body);
  } catch (err) {
    console.error("Push send failed:", err.message);
  }
}

module.exports = { notifyDoctor };
