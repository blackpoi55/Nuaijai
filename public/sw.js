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
  const url = data.url || "/";

  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // เปิดแอปค้างอยู่บนจอ → ให้แอปแสดงแบนเนอร์ใหญ่เอง (เด่นกว่ากล่องแจ้งเตือนของระบบ)
      const visible = tabs.find((c) => c.visibilityState === "visible" && c.focused);
      tabs.forEach((c) => c.postMessage({ type: "nh-notify", show: !!visible && c === visible, note: { title, body: data.body || "", url, important: !!data.important, action: data.action } }));
      if (visible) return;

      await self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icons/192.png",
        badge: "/icons/badge-96.png",
        image: data.image || undefined, // Android: รูปแบนเนอร์ใหญ่
        tag: data.tag || undefined,
        renotify: !!data.tag,
        requireInteraction: !!data.important, // แจ้งเตือนแอดมินค้างจนกว่าจะกด
        vibrate: data.important ? [300, 120, 300, 120, 500] : [150, 80, 150],
        actions: [{ action: "open", title: data.action || "เปิดดู" }],
        data: { url },
        timestamp: Date.now(),
      });
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
