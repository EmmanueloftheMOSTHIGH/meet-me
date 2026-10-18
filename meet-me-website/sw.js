// Meet Me service worker — handles incoming web push notifications.

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = { title: 'Meet Me', body: 'Something new happened.' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  var options = {
    body: data.body,
    // No tag = its own notification. A tag (e.g. one per chat) makes newer
    // messages replace the older one, and renotify still alerts you.
    tag: data.tag || undefined,
    renotify: !!data.tag,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url || './' }
  };
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // The app is open and on screen: everything is already visible inside it
      // (toast, badge, bell), so don't also pop a notification on top.
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].visibilityState === 'visible') return;
      }
      return self.registration.showNotification(data.title || 'Meet Me', options);
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) { return client.focus(); }
      }
      if (self.clients.openWindow) { return self.clients.openWindow(targetUrl); }
    })
  );
});
