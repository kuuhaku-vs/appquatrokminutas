// Gerador de Minutas — service worker: guarda a tela para abrir rápido como app.
// Arquivos do próprio site: busca na rede primeiro (atualizações chegam na hora) e usa a cópia se estiver sem sinal.
// Pedidos ao Google (outro endereço) nunca passam pelo cache.
const CACHE = 'minutas-202611091615';
const ASSETS = ['./', './index.html', './style.css', './app.js', './ui.js', './web-api.js', './config.js', './print.js', './frete-cortesia.js', './logo.js', './logo.png', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
