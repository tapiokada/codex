// Cache the application shell only. Business commands always require server time
// and are never queued or replayed offline. No activation during an adventure.
const CACHE='ai103-shell-v4';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/style.css','/app.js','/explanations.js','/icon.svg','/manifest.json']))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api/'))return;e.respondWith(caches.open(CACHE).then(cache=>cache.match(e.request)).then(cached=>cached||fetch(e.request)));});
self.addEventListener('message',e=>{if(e.data==='activate-after-session')self.skipWaiting();});

self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ai103-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
