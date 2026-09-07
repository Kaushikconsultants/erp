// Service Worker for Real-Time CRM Mobile & Web Push Notifications
// Location: public/sw.js

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: '🔔 CRM Notification',
      body: event.data.text() || 'You have a new update in CRM',
      url: '/leads'
    };
  }

  const title = payload.title || '🔔 CRM Notification';
  const targetUrl = payload.url || payload.data?.url || '/';

  const notificationOptions = {
    body: payload.body || 'Tap to open CRM',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    tag: payload.tag || `crm-notif-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [250, 100, 250, 100, 250],
    data: {
      url: targetUrl,
      ...(payload.data || {})
    },
    actions: [
      { action: 'open', title: '👀 View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url && 'focus' in client) {
            if ('navigate' in client && urlToOpen) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
