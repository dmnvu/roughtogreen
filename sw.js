var CACHE = 'rtg-v4';
var FILER = ['/', '/index.html', '/css/style.css', '/js/config.js', '/js/courses.js', '/js/db.js', '/js/app.js'];
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(FILER); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e) {
  if (e.request.url.includes('supabase.co') || e.request.url.includes('open-meteo')) return;
  e.respondWith(caches.match(e.request).then(function(cached) {
    return cached || fetch(e.request).catch(function() { return caches.match('/index.html'); });
  }));
});
