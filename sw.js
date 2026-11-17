// Gerador de Minutas — service worker: guarda a tela para abrir rápido como app.
// Arquivos do próprio site: busca na rede primeiro (atualizações chegam na hora) e usa a cópia se estiver sem sinal.
// Pedidos ao Google (outro endereço) nunca passam pelo cache.
const CACHE = 'minutas-202611171700';
const ASSETS = ['./', './index.html', './style.css', './app.js', './auth.js', './pedidos.js', './inicio.js', './icon.ico', './destinatarios.js', './email-modelo.js', './auditoria.js', './auth.css', './ui.js', './web-api.js', './config.js', './print.js', './frete-cortesia.js', './logo.js', './logo.png', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  // 4.0: arquivo com versão no endereço (style.css?v=...) nunca muda: vem do cache na hora, sem ir ao GitHub.
  // Versão nova = endereço novo (o index.html troca o ?v=), então não existe risco de ficar com arquivo velho.
  if (u.searchParams.has('v')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => { if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return resp; }).catch(() => caches.match(e.request, { ignoreSearch: true }))));
    return;
  }
  // cache: 'no-cache' revalida com o GitHub a cada abertura: a versão nova chega na hora, sem esperar o cache de 10 min.
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
