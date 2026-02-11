// Basic service worker for push notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  clients.claim();
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Notification", body: "" };
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png"
  };

  event.waitUntil(self.registration.showNotification(data.title || "Notification", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
