
// This is the service worker for PWA capabilities.
// DISABLED FOR DEVELOPMENT - just pass through all requests

const CACHE_NAME = 'painel-financeiro-cache-v3';

// Install event: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing and skipping wait');
  self.skipWaiting();
});

// Activate event: claim clients and clear all caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating and claiming clients');
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Clear ALL caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    ])
  );
});

// Fetch event: DO NOTHING - let browser handle everything normally
// This effectively disables the SW for development
self.addEventListener('fetch', (event) => {
  // Don't call event.respondWith() - this makes the SW transparent
  // The browser will handle the request normally
  return;
});
