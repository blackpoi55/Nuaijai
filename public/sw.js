// Service worker ของแอปเหนื่อยใจ: รับ Web Push แล้วแสดงแจ้งเตือน, กดแล้วเปิดหน้าที่เกี่ยวข้อง
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "เหนื่อยใจ", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "เหนื่อยใจ";
  const options = {
    body: data.body || "",
    icon: "/icons/192.png",
    badge: "/icons/badge-96.png",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || "/" },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // บอกหน้าเว็บที่เปิดอยู่ให้รีเฟรชกระดิ่ง
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      tabs.forEach((c) => c.postMessage({ type: "nh-notify" }));
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of tabs) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
