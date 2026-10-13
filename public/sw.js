// Service Worker untuk Web Push Notification JokiDay
self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    let data;
    try {
      data = event.data.json();
    } catch {
      data = {
        title: 'JokiDay',
        body: event.data.text() || 'Anda memiliki pesan baru di JokiDay.',
      };
    }

    const title = data.title || 'JokiDay';
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: {
        url: data.url || '/',
      },
      tag: data.tag || 'jokiday-notification',
      renotify: true,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[ServiceWorker] Gagal memproses event push:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
