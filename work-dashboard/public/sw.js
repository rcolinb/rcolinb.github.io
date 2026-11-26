/* Only verified dashboard shells are eligible for offline reopening. */
const CACHE_PREFIX = 'work-dashboard-shell-v3-';
const LEGACY_PREFIX = 'work-dashboard-shell-';
const READY_KEY = '/__work_dashboard_ready__';
const CORE = ['/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];
const ORIGIN = self.location.origin;
const shellPath = url => url.origin === ORIGIN && (url.pathname === '/' || url.pathname === '/index.html');
const assetPath = url => url.origin === ORIGIN && !url.search && (/^\/(assets|icons)\/.+\.(?:js|mjs|css|png|svg|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$/i.test(url.pathname) || url.pathname === '/manifest.webmanifest');
let preparing = new Map();
let lastCommitTime = 0;
const SAFE_HEADERS = ['Content-Type','Content-Security-Policy','Referrer-Policy','X-Content-Type-Options','X-Frame-Options','Permissions-Policy','Cross-Origin-Opener-Policy','Cross-Origin-Resource-Policy','Cross-Origin-Embedder-Policy'];
function savedHeaders(response) {
  const headers = {};
  for (const name of SAFE_HEADERS) { const value = response.headers.get(name); if (value) headers[name] = value; }
  return headers;
}

async function network(request, milliseconds = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);
  try { return await fetch(request, {cache:'no-store', signal:controller.signal}); }
  finally { clearTimeout(timeout); }
}

function directResponse(response, expected) {
  if (!response || response.status !== 200 || response.redirected || ['opaque', 'opaqueredirect', 'error'].includes(response.type)) return false;
  if (response.url) {
    const actual = new URL(response.url);
    if (actual.origin !== ORIGIN || actual.pathname !== new URL(expected, ORIGIN).pathname) return false;
  }
  return true;
}

function assetReferences(text, base) {
  const urls = new Set();
  // Vite's static imports, lazy chunk map, CSS imports and font/image URLs.
  const patterns = [/["'`](\/?assets\/[^"'`\s]+|\.\.?\/[^"'`\s]+)["'`]/g, /(?:url\(\s*|@import\s+)["']?([^\s"')]+)["']?\s*\)?/g];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) {
    try { const value = match[1].startsWith('assets/') ? `/${match[1]}` : match[1]; const url = new URL(value, base); if (assetPath(url)) urls.add(url.href); } catch {}
  }
  return [...urls];
}

async function inspectShell(response, expected = '/index.html') {
  if (!directResponse(response, expected) || !/^text\/html(?:;|$)/i.test(response.headers.get('Content-Type') || '')) return null;
  const html = await response.clone().text();
  if (!/<meta\s+[^>]*name=["']work-dashboard-shell["'][^>]*content=["']1["'][^>]*>/i.test(html) || !/<div\s+[^>]*id=["']root["']/i.test(html)) return null;
  const assets = new Set();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
    let url; try { url = new URL(match[1], ORIGIN); } catch { return null; }
    if (assetPath(url)) assets.add(url.href);
  }
  if (![...assets].some(url => /\/assets\/.+\.(?:js|mjs)$/.test(url)) || ![...assets].some(url => /\/assets\/.+\.css$/.test(url))) return null;
  return {html, assets:[...assets]};
}

async function inspectAsset(response, url) {
  if (!directResponse(response, url)) throw new Error('A required app file is unavailable.');
  const path = new URL(url, ORIGIN).pathname;
  const type = (response.headers.get('Content-Type') || '').split(';')[0].toLowerCase().trim();
  const js = /\.(?:js|mjs)$/.test(path), css = /\.css$/.test(path);
  const validType = js ? /^(?:text|application)\/(?:x-)?(?:java|ecma)script$/.test(type) : css ? type === 'text/css' : path.endsWith('.webmanifest') ? ['application/manifest+json', 'application/json'].includes(type) : /\.(?:woff2?|ttf|otf)$/.test(path) ? /^(?:font\/|application\/(?:font|x-font|octet-stream))/.test(type) : /^image\//.test(type);
  if (!validType) throw new Error('A required app file was replaced by a sign-in or error response.');
  if (js || css) {
    const text = await response.clone().text();
    if (/^\s*(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(text)) throw new Error('HTML is not an app asset.');
    return assetReferences(text, url);
  }
  if (path.endsWith('.webmanifest')) await response.clone().json();
  return [];
}

async function readyCaches() {
  const ready = [];
  for (const name of await caches.keys()) {
    if (!name.startsWith(CACHE_PREFIX)) continue;
    const cache = await caches.open(name);
    try {
      const marker = await cache.match(READY_KEY);
      if (!marker) continue;
      const record = await marker.json();
      if (record.version !== 3 || !Array.isArray(record.assets) || !record.assets.length || !record.assets.every(value => assetPath(new URL(value, ORIGIN)))) continue;
      const shell = await cache.match('/index.html');
      if (!shell || !await inspectShell(shell)) continue;
      if (!(await Promise.all(record.assets.map(url => cache.match(url)))).every(Boolean)) continue;
      ready.push({name, cache, record});
    } catch { /* Incomplete caches are never fallback candidates. */ }
  }
  return ready.sort((a,b) => b.record.savedAt - a.record.savedAt);
}

async function cachedShell() {
  const ready = await readyCaches();
  return ready.length ? ready[0].cache.match('/index.html') : undefined;
}

async function prune() {
  const ready = await readyCaches();
  if (!ready.length) return;
  const keep = new Set(ready.slice(0,3).map(entry => entry.name));
  for (const name of await caches.keys()) if (name.startsWith(LEGACY_PREFIX) && !keep.has(name) && !preparing.has(name)) await caches.delete(name);
}

async function stageShell(response, expected = '/index.html') {
  const shell = await inspectShell(response, expected);
  if (!shell) return false;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(shell.html));
  const digest = [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2,'0')).join('');
  const name = `${CACHE_PREFIX}${digest}`;
  if ((await readyCaches()).some(entry => entry.name === name)) return true;
  if (preparing.has(name)) return preparing.get(name);
  const promise = (async () => {
    const files = new Map(), pending = [...new Set([...shell.assets, ...CORE.map(path => new URL(path, ORIGIN).href)])];
    try {
      // Fetch and validate the whole dependency set before publishing any shell.
      for (let index = 0; index < pending.length; index += 1) {
        if (pending.length > 128) throw new Error('App dependency set is unexpectedly large.');
        const url = pending[index], asset = await network(url);
        const dependencies = await inspectAsset(asset, url);
        files.set(url, asset);
        for (const dependency of dependencies) if (!pending.includes(dependency)) pending.push(dependency);
      }
      const cache = await caches.open(name);
      for (const [url, asset] of files) await cache.put(url, new Response(await asset.arrayBuffer(), {status:200, headers:savedHeaders(asset)}));
      // Strip response URL/redirect metadata from the reusable shell copy. The
      // original response was checked above; the snapshot is always at index.
      const reusableShell = new Response(shell.html, {status:200, headers:{...savedHeaders(response), 'Content-Type':'text/html; charset=utf-8'}});
      await cache.put('/index.html', reusableShell);
      const previousTime = (await readyCaches()).reduce((latest,entry) => Math.max(latest,entry.record.savedAt),0);
      lastCommitTime = Math.max(Date.now(),previousTime+1,lastCommitTime+1);
      await cache.put(READY_KEY, new Response(JSON.stringify({version:3, assets:[...files.keys()], savedAt:lastCommitTime}), {headers:{'Content-Type':'application/json'}}));
      return true;
    } catch (error) {
      await caches.delete(name);
      throw error;
    }
  })();
  preparing.set(name, promise);
  try { return await promise; } finally { preparing.delete(name); }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await network(new URL('/index.html', ORIGIN).href);
    if (!await stageShell(response)) throw new Error('A verified dashboard shell is required.');
    // No skipWaiting: an existing app can finish its edits before an upgrade.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => { await prune(); await self.clients.claim(); })());
});

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ORIGIN || url.pathname.startsWith('/api/') || url.pathname.startsWith('/cdn-cgi/')) return;
  if (request.mode === 'navigate' && shellPath(url)) {
    event.respondWith((async () => {
      try {
        const response = await network(request);
        // Access challenges/redirects must remain real authentication flows.
        // Only an unavailable upstream (5xx) or a network error uses the cache.
        if (response.status >= 500 && response.status <= 599) return (await cachedShell()) || response;
        if (response.status !== 200 || response.redirected || ['opaque','opaqueredirect'].includes(response.type)) return response;
        try {
          const staged = await stageShell(response, url.href);
          if (staged) { event.waitUntil(prune()); return response; }
        } catch {
          const fallback = await cachedShell();
          if (fallback) return fallback;
        }
        return response;
      } catch {
        return (await cachedShell()) || new Response('This device has no saved dashboard yet. Connect to the Mac and open the dashboard once before using it offline.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
  } else if (assetPath(url)) {
    event.respondWith((async () => {
      for (const entry of await readyCaches()) {
        if (!entry.record.assets.includes(url.href)) continue;
        const cached = await entry.cache.match(request);
        if (cached) return cached;
      }
      // Unknown files may be fetched online but are never added opportunistically.
      return fetch(request);
    })());
  }
});
