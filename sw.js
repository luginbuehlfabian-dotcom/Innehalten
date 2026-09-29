/* Innehalten – Service Worker
   - App-Dateien: zuerst Netzwerk (damit Updates sofort ankommen), offline aus dem Cache
   - Audios: aus dem Cache, sobald eine Übung einmal abgespielt wurde (mit Range-Unterstützung für Safari)
   Nach größeren Änderungen an der App VERSION erhöhen. */
const VERSION = 'v4';
const SHELL = 'innehalten-shell-' + VERSION;
const AUDIO = 'innehalten-audio-v1';
const SHELL_FILES = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './content.json',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];
const AUDIO_RE = /\.(mp3|m4a|aac|mp4|wav|ogg|opus)$/i;
// Audiodateien: an der Endung erkennbar oder direkt aus Google Drive (Drive API, alt=media)
const isAudio = url => AUDIO_RE.test(url.pathname) ||
  (url.hostname === 'www.googleapis.com' && url.pathname.startsWith('/drive/') && url.searchParams.get('alt') === 'media');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('innehalten-shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Audios auch von externem Speicher (z. B. Cloudflare R2) offline bereitstellen
  if (isAudio(url)) { e.respondWith(audioResponse(req)); return; }
  if (url.origin !== location.origin) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await withTimeout(fetch(req), 4000);
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') return cache.match('./index.html');
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

function withTimeout(p, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}

async function audioResponse(req) {
  const cache = await caches.open(AUDIO);
  const url = req.url.split('#')[0];
  const cached = await cache.match(url, { ignoreSearch: true });
  if (!cached) return networkAudio(req);
  const range = req.headers.get('range');
  if (!range) return cached;
  // Safari lädt Audio stückweise (Range-Anfragen) – Teilantwort aus dem Cache bauen
  const blob = await cached.blob();
  const size = blob.size;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = 0, end = size - 1;
  if (m) {
    if (m[1] === '' && m[2] !== '') { start = Math.max(0, size - Number(m[2])); }
    else { start = Number(m[1] || 0); if (m[2] !== '') end = Math.min(Number(m[2]), size - 1); }
  }
  if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

/* Drive-Audios selbst abrufen: So wird die Herkunft (Referer) immer mitgeschickt,
   auch wenn der Audio-Player von iOS das nicht tut. Nötig für die Website-Einschränkung des API-Schlüssels. */
async function networkAudio(req) {
  const url = new URL(req.url);
  if (url.hostname !== 'www.googleapis.com') return fetch(req);
  const headers = {};
  const range = req.headers.get('range');
  if (range) headers.Range = range;
  try {
    return await fetch(req.url, { headers, mode: 'cors', credentials: 'omit', referrer: self.registration.scope, referrerPolicy: 'strict-origin-when-cross-origin' });
  } catch (err) {
    return fetch(req);
  }
}
