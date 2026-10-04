// Service worker de Terra Nova (F93 / F94) : l'essentiel reste consultable quand le réseau ou le serveur ne répond plus.
// - Pages et fichiers du site : réseau d'abord (3 s), puis la dernière copie gardée sur l'appareil.
// - Informations essentielles (alertes, transports, partenaires) : même règle, la dernière version reçue est conservée.
// - Jamais mis en cache : envois (POST), espace agent (/api/agent/), flux en direct (/api/stream), assistant IA.
const CACHE = 'terra-nova-v20';
const API_KEEP = /^\/api\/(essential|broadcasts|transport|partners|outage)$/;

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        let assets = [];
        try {
            const response = await fetch('/', { cache: 'reload' });
            const html = await response.clone().text();
            await cache.put('/', response);
            assets = Array.from(html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)).map(match => '/' + match[1]);
        } catch (err) { }
        await Promise.all(assets.map(async url => { try { const r = await fetch(url, { cache: 'reload' }); if (r.ok) await cache.put(url, r); } catch (err) { } }));
        try { const r = await fetch('/api/essential', { cache: 'reload' }); if (r.ok) await cache.put('/api/essential', r); } catch (err) { }
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

function networkFirst(request, key, timeoutMs) {
    return new Promise(resolve => {
        let settled = false;
        const fallback = async () => {
            const cache = await caches.open(CACHE);
            return (await cache.match(key)) || null;
        };
        const timer = setTimeout(async () => {
            const cached = await fallback();
            if (cached && !settled) { settled = true; resolve(cached); }
        }, timeoutMs);
        fetch(request).then(async response => {
            clearTimeout(timer);
            if (response && response.ok) {
                const cache = await caches.open(CACHE);
                cache.put(key, response.clone());
            }
            if (!settled) { settled = true; resolve(response); }
        }).catch(async () => {
            clearTimeout(timer);
            const cached = await fallback();
            if (!settled) { settled = true; resolve(cached || new Response('', { status: 503, statusText: 'Hors ligne' })); }
        });
    });
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, '/', 3000));
        return;
    }
    if (/^\/assets\/.+\.(js|css)$/.test(url.pathname)) {
        event.respondWith(networkFirst(request, url.pathname, 3000));
        return;
    }
    if (API_KEEP.test(url.pathname)) {
        event.respondWith(networkFirst(request, url.pathname, 4000));
    }
});
