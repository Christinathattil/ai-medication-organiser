// Service Worker for Medication Manager
const CACHE_NAME = 'medication-manager-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/chatbot.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Medication Reminder';
  const options = {
    body: data.body || 'Time to take your medication',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'medication-reminder',
    requireInteraction: true,
    actions: [
      { action: 'taken', title: 'Mark as Taken' },
      { action: 'snooze', title: 'Snooze 10 min' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'taken') {
    // Handle marking as taken
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'snooze') {
    // Snooze for 10 minutes
    setTimeout(() => {
      self.registration.showNotification('Medication Reminder', {
        body: 'Snoozed reminder - time to take your medication',
        icon: '/icon-192.png'
      });
    }, 10 * 60 * 1000);
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
