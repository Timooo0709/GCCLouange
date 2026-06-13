// Service Worker — GCC Louange
// Version « push-only » : ce worker ne gère QUE les notifications Web Push.
// Le cache hors-ligne a été volontairement retiré (il provoquait l'affichage de
// déploiements périmés). On garde donc le SW minimal — un SW reste indispensable
// pour recevoir des notifications push sur PWA iOS/Android.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Réception d'une notification push ─────────────────────────────────────────
// Le serveur envoie un JSON : { title, body, url, tag }.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "GCC Louange";
  const options = {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    // tag : regroupe/remplace les notifs d'un même sujet (ex. une setlist)
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Clic sur la notification ──────────────────────────────────────────────────
// Focus un onglet existant de l'app si possible, sinon en ouvre un.

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
