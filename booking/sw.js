/* ===================================
   Pass Plus SOM - Service Worker
   PWA functionality and offline support
   =================================== */

const CACHE_NAME = 'pass-plus-som-v1.0.0';
const OFFLINE_PAGE = '/offline.html';

// Resources to cache for offline functionality
const CORE_CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/login.html',
  '/register.html',
  '/book-lesson.html',
  '/manifest.json',
  
  // CSS files
  '/css/main.css',
  '/css/components.css',
  '/css/booking.css',
  '/css/responsive.css',
  
  // JavaScript files
  '/js/config.js',
  '/js/utils.js',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/booking.js',
  '/js/calendar.js',
  '/js/payments.js',
  '/js/dashboard.js',
  
  // Essential icons and images
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/default-avatar.svg',
  '/assets/icons/logo.svg',
  
  // Offline page
  OFFLINE_PAGE
];

// Resources to cache on first visit (less critical)
const EXTENDED_CACHE_RESOURCES = [
  '/assets/images/hero-bg.jpg',
  '/assets/images/how-it-works-1.jpg',
  '/assets/images/how-it-works-2.jpg',
  '/assets/images/how-it-works-3.jpg',
  '/assets/icons/feature-*.svg'
];

// Network-first cache strategy URLs
const NETWORK_FIRST_URLS = [
  '/api/',
  'https://api.postcodes.io/',
  'supabase'
];

// Cache-first URLs
const CACHE_FIRST_URLS = [
  '/assets/',
  '/css/',
  '/js/',
  'fonts.googleapis.com',
  'cdnjs.cloudflare.com'
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core resources');
        return cache.addAll(CORE_CACHE_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Core resources cached');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache core resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim control of all clients
        return self.clients.claim();
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Cache extended resources in background
        cacheExtendedResources();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(request));
  } else if (isCacheFirst(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Network-first strategy (for API calls and dynamic content)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_PAGE);
    }
    
    throw error;
  }
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch:', request.url);
    throw error;
  }
}

// Stale-while-revalidate strategy (for HTML pages)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.log('[SW] Network fetch failed:', request.url);
    
    // For navigation requests, return offline page if no cache
    if (request.mode === 'navigate' && !cachedResponse) {
      return caches.match(OFFLINE_PAGE);
    }
    
    throw error;
  });
  
  return cachedResponse || fetchPromise;
}

// Check if URL should use network-first strategy
function isNetworkFirst(url) {
  return NETWORK_FIRST_URLS.some(pattern => url.href.includes(pattern));
}

// Check if URL should use cache-first strategy
function isCacheFirst(url) {
  return CACHE_FIRST_URLS.some(pattern => url.href.includes(pattern));
}

// Cache extended resources in background
async function cacheExtendedResources() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(EXTENDED_CACHE_RESOURCES);
    console.log('[SW] Extended resources cached');
  } catch (error) {
    console.log('[SW] Failed to cache extended resources:', error);
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'booking-sync') {
    event.waitUntil(syncOfflineBookings());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Sync offline bookings when back online
async function syncOfflineBookings() {
  try {
    console.log('[SW] Syncing offline bookings');
    
    // Get offline bookings from IndexedDB
    const offlineBookings = await getOfflineBookings();
    
    for (const booking of offlineBookings) {
      try {
        // Attempt to submit booking
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(booking.data)
        });
        
        if (response.ok) {
          // Remove from offline storage
          await removeOfflineBooking(booking.id);
          console.log('[SW] Offline booking synced:', booking.id);
          
          // Notify user of successful sync
          showNotification('Booking Confirmed', {
            body: 'Your offline booking has been confirmed',
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/badge.png',
            tag: 'booking-sync',
            data: { bookingId: booking.id }
          });
        }
      } catch (error) {
        console.error('[SW] Failed to sync booking:', booking.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync notifications
async function syncNotifications() {
  try {
    console.log('[SW] Syncing notifications');
    // Implementation would fetch latest notifications
  } catch (error) {
    console.error('[SW] Notification sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Pass Plus SOM',
    body: 'You have a new notification',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge.png',
    tag: 'default'
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  // Handle different notification types
  const data = event.notification.data || {};
  let url = '/';
  
  switch (event.notification.tag) {
    case 'booking-reminder':
      url = '/dashboard.html';
      break;
    case 'booking-confirmed':
      url = '/dashboard.html';
      break;
    case 'instructor-message':
      url = '/dashboard.html#messages';
      break;
    default:
      url = '/dashboard.html';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(url.split('#')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Show notification helper
async function showNotification(title, options) {
  const registration = await self.registration;
  return registration.showNotification(title, {
    body: options.body || '',
    icon: options.icon || '/assets/icons/icon-192x192.png',
    badge: options.badge || '/assets/icons/badge.png',
    tag: options.tag || 'default',
    data: options.data || {},
    requireInteraction: options.requireInteraction || false,
    vibrate: options.vibrate || [200, 100, 200],
    actions: options.actions || []
  });
}

// IndexedDB helpers for offline storage
async function getOfflineBookings() {
  // Implementation would use IndexedDB to store offline bookings
  return [];
}

async function removeOfflineBooking(bookingId) {
  // Implementation would remove booking from IndexedDB
  console.log('[SW] Removing offline booking:', bookingId);
}

// Handle periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'lesson-reminders') {
    event.waitUntil(checkLessonReminders());
  }
});

// Check for upcoming lesson reminders
async function checkLessonReminders() {
  try {
    console.log('[SW] Checking lesson reminders');
    // Implementation would check for upcoming lessons and send reminders
  } catch (error) {
    console.error('[SW] Failed to check lesson reminders:', error);
  }
}

// Handle app update notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache management utilities
async function cleanOldCaches() {
  const cacheWhitelist = [CACHE_NAME];
  const cacheNames = await caches.keys();
  
  return Promise.all(
    cacheNames.map((cacheName) => {
      if (!cacheWhitelist.includes(cacheName)) {
        console.log('[SW] Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

// Performance monitoring
let performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  errors: 0
};

// Log cache performance
function logCacheHit() {
  performanceMetrics.cacheHits++;
}

function logCacheMiss() {
  performanceMetrics.cacheMisses++;
}

function logNetworkRequest() {
  performanceMetrics.networkRequests++;
}

function logError() {
  performanceMetrics.errors++;
}

// Send performance metrics periodically
setInterval(() => {
  if (performanceMetrics.networkRequests > 0) {
    console.log('[SW] Performance metrics:', performanceMetrics);
    // In production, send metrics to analytics service
    performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      networkRequests: 0,
      errors: 0
    };
  }
}, 300000); // Every 5 minutes

console.log('[SW] Service worker loaded');