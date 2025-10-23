// Service Worker for Push Notifications and Offline Support
const CACHE_NAME = 'medicare-pro-v1';
const urlsToCache = [
  '/',
  '/app.js',
  '/index.html',
  '/login.html'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate service worker and clean old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch with cache fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification.tag, event.action);
  
  const notification = event.notification;
  const scheduleId = notification.tag;
  const medicationId = notification.data?.medicationId;
  
  notification.close();
  
  // Handle action buttons
  if (event.action === 'taken') {
    console.log('✅ User marked medication as TAKEN');
    // Log as taken
    event.waitUntil(
      fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          medication_id: medicationId,
          schedule_id: scheduleId,
          status: 'taken',
          taken_at: new Date().toISOString()
        })
      }).then((res) => {
        if (res.ok) {
          console.log('✅ Medication logged as taken');
          // Show success notification
          self.registration.showNotification('✅ Medication Logged', {
            body: 'Marked as taken successfully!',
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: 'log-success'
          });
        }
      }).catch((err) => {
        console.error('❌ Error logging medication:', err);
      })
    );
  } else if (event.action === 'skipped') {
    console.log('⏭️ User marked medication as SKIPPED');
    // Log as skipped
    event.waitUntil(
      fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          medication_id: medicationId,
          schedule_id: scheduleId,
          status: 'missed',
          taken_at: new Date().toISOString()
        })
      }).then((res) => {
        if (res.ok) {
          console.log('✅ Medication logged as skipped');
          self.registration.showNotification('⏭️ Medication Skipped', {
            body: 'Marked as skipped. Remember to take it when you can!',
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: 'log-success'
          });
        }
      }).catch((err) => {
        console.error('❌ Error logging medication:', err);
      })
    );
  } else {
    // No action button clicked - just open the app
    event.waitUntil(
      clients.openWindow('/').catch(() => {
        console.log('Could not open window');
      })
    );
  }
});

// Handle push events (for future server-sent push notifications)
self.addEventListener('push', (event) => {
  console.log('📩 Push received:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Time to take your medication',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      tag: data.scheduleId || 'medication-reminder',
      requireInteraction: true,
      data: {
        medicationId: data.medicationId,
        scheduleId: data.scheduleId
      },
      actions: [
        { action: 'taken', title: '✅ Taken', icon: '/check-icon.png' },
        { action: 'skipped', title: '⏭️ Skip', icon: '/skip-icon.png' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '💊 Medication Reminder', options)
    );
  }
});
