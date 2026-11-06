// Install support, offline shell, reminders. API calls always hit the network.
const CACHE = "clara-shell-v2";
const REMINDERS = "clara-reminders-v1"; // filled by lib/notify.ts

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/icons/icon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== REMINDERS).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
  }
});

async function reminderText(id) {
  try {
    const cache = await caches.open(REMINDERS);
    const res = await cache.match("/__clara/reminders");
    const texts = res ? await res.json() : {};
    if (texts[id]) return texts[id];
  } catch {
    /* use the plain text below */
  }
  return { title: "Clara", body: "Tienes un recordatorio. / You have a reminder.", assignment: "" };
}

// Push has only an id. Phones must show something for every push, so keep a fallback.
self.addEventListener("push", (event) => {
  let id = "";
  try {
    id = event.data ? event.data.json().id : "";
  } catch {
    /* bad payload */
  }
  event.waitUntil(
    reminderText(id).then((r) =>
      self.registration.showNotification(r.title, {
        body: r.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: id || "clara",
        data: { url: r.assignment ? `/?open=${encodeURIComponent(r.assignment)}` : "/" },
      }),
    ),
  );
});

// open the assignment, reuse a window if there is one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list[0];
      if (open) return open.navigate(url).then((c) => (c || open).focus()).catch(() => open.focus());
      return self.clients.openWindow(url);
    }),
  );
});
