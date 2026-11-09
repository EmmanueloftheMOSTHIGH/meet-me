// Meet Me service worker — handles incoming web push notifications.

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

// Share-in: lets Meet Me appear in the Android share sheet for pictures and videos.
// The manifest sends the shared files here as a POST to /share-target. They are kept briefly in a cache, then the
// app opens at ?mm_share=N, where index.html picks them up and drops them into a new Rant post.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'POST') return;
  if (new URL(req.url).pathname !== '/share-target') return;
  event.respondWith((async function () {
    function home(q) { return new URL('./' + q, self.registration.scope).href; }
    try {
      var form = await req.formData();
      var files = form.getAll('media').filter(function (f) { return f && typeof f !== 'string'; }).slice(0, 4);
      var cache = await caches.open('meetme-share');
      var old = await cache.keys();
      for (var k = 0; k < old.length; k++) await cache.delete(old[k]);   // only the latest share is kept
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        await cache.put('/shared-media/' + i, new Response(f, {
          headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-Name': encodeURIComponent(f.name || 'shared') }
        }));
      }
      return Response.redirect(home('?mm_share=' + files.length), 303);
    } catch (e) {
      return Response.redirect(home(''), 303);
    }
  })());
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
      // Reuse an already-open Meet Me window if there is one.
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
          return c.focus().then(function (w) {
            return w && 'navigate' in w ? w.navigate(target) : w;
          });
        }
      }
      // Otherwise open it. When the app is installed, Android opens the app, not Chrome.
      return self.clients.openWindow(target);
    })
  );
});
