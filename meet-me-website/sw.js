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
    tag: data.tag || 'meet-me',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Meet Me', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var raw = (event.notification.data && event.notification.data.url) || '/';
  var target = new URL(raw, self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      // App already open: bring it forward and tell it where to go. No reload, never a browser tab.
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
          return c.focus().then(function (w) {
            (w || c).postMessage({ type: 'mm-open', url: target });
            return w;
          });
        }
      }
      // App closed: open a link inside the manifest scope; an installed app catches it.
      return self.clients.openWindow(target);
    })
  );
});
