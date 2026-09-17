/* Solar-only offline worker. Never cache API, RSC, POST or unrelated pages. */
const PREFIX = 'solortide-solar-offline-v1-';
const CONTROL = PREFIX + 'control';
const STATE = '/solar-analysis/__offline-state';
const HOME = '/solar-analysis';
let preparing;
let controller;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const isHome = url => url.origin === self.location.origin && (url.pathname === HOME || url.pathname === HOME + '/');
const allowedAsset = path => /^\/_next\/static\/(?:chunks|css|media)\/[\w./-]+$/.test(path)
  || /^\/solar-data\/models\.[a-f0-9]+\.json$/.test(path)
  || ['/icon.svg', '/fonts/report-space-grotesk-v1.ttf', '/fonts/report-noto-sans-sc-v1.ttf', '/solar-analysis/icon-192.png', '/solar-analysis/icon-512.png', '/solar-analysis/manifest.webmanifest'].includes(path);

async function state() {
  const response = await (await caches.open(CONTROL)).match(STATE);
  return response ? response.json() : null;
}
async function complete(saved) {
  if (!saved || !saved.cache?.startsWith(PREFIX + 'data-') || !Array.isArray(saved.urls)) return false;
  if (!(await caches.keys()).includes(saved.cache)) return false;
  const cache = await caches.open(saved.cache);
  return (await Promise.all(saved.urls.map(url => cache.match(url)))).every(Boolean);
}
async function clear() {
  await Promise.all((await caches.keys()).filter(name => name.startsWith(PREFIX)).map(name => caches.delete(name)));
}
async function network(url, signal) {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]) });
  if (!response.ok || response.redirected) throw new Error('资源下载失败，请检查网络后重试。');
  return response;
}
async function permission(signal) {
  const response = await fetch('/solar-analysis/offline-permission', { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  const data = await response.json();
  if (!response.ok || data.authorized !== true) throw new Error(data.error || '请联网重新验证密码。');
}
async function prepare(port, signal) {
  let staging;
  try {
    await permission(signal);
    const manifest = await (await network('/solar-analysis/offline-assets.json', signal)).json();
    if (manifest.schema !== 1 || !/^[a-f0-9]{20}$/.test(manifest.version) || !Array.isArray(manifest.assets) || !manifest.assets.length || manifest.assets.length > 300
      || manifest.assets.some(a => !allowedAsset(a.url) || a.url.includes('..') || !/^[a-f0-9]{64}$/.test(a.sha256) || !Number.isSafeInteger(a.bytes) || a.bytes <= 0)
      || new Set(manifest.assets.map(a => a.url)).size !== manifest.assets.length) throw new Error('离线资源清单无效，请重新构建后重试。');
    const htmlResponse = await network(HOME + '?offline-shell=1', signal);
    const html = await htmlResponse.text();
    if (!html.includes('data-solar-authorized="true"') || html.includes('id="solar-password"')) throw new Error('验证已失效，请重新输入密码。');
    const paths = new Set(manifest.assets.map(a => a.url));
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const linked = new URL(match[1].replace(/&amp;/g, '&'), self.location.origin);
      if (linked.pathname.startsWith('/_next/static/') && (linked.origin !== self.location.origin || !paths.has(linked.pathname))) {
        throw new Error('页面与离线资源版本不一致，请刷新后重新下载。');
      }
    }
    // Preserve server HTML exactly: modifying head links causes React hydration
    // mismatches. The font stylesheet gets a local fallback below instead.
    const previous = await state();
    staging = PREFIX + 'data-' + manifest.version + '-' + Date.now();
    const cache = await caches.open(staging);
    let loaded = 0;
    const total = manifest.assets.reduce((n, a) => n + a.bytes, 0);
    for (let i = 0; i < manifest.assets.length; i++) {
      signal.throwIfAborted();
      const asset = manifest.assets[i];
      // Network fetches are intentionally not satisfied from an old offline pack.
      const response = await network(asset.url, signal);
      const bytes = await response.clone().arrayBuffer();
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
      if (hash !== asset.sha256 || bytes.byteLength !== asset.bytes) throw new Error('资源版本不一致，请刷新页面后重试。');
      await cache.put(asset.url, response);
      loaded += asset.bytes;
      port.postMessage({ progress: true, percent: Math.round(loaded / total * 95), message: `正在保存离线资源 ${i + 1}/${manifest.assets.length}（${(loaded / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB）` });
    }
    // Recheck authorization at commit time; a failed/cancelled update never
    // replaces the previous complete version.
    await permission(signal);
    signal.throwIfAborted();
    await cache.put(HOME, new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Solar-Offline': '1' } }));
    signal.throwIfAborted();
    const saved = { cache: staging, version: manifest.version, bytes: total, preparedAt: new Date().toISOString(), urls: [HOME, ...manifest.assets.map(a => a.url)] };
    await (await caches.open(CONTROL)).put(STATE, Response.json(saved));
    staging = null;
    // Keep one previous complete version for already-open tabs after an update.
    await Promise.all((await caches.keys()).filter(name => name.startsWith(PREFIX + 'data-') && name !== saved.cache && name !== previous?.cache).map(name => caches.delete(name)));
    return { ready: true, version: saved.version, bytes: total, preparedAt: saved.preparedAt };
  } finally {
    if (staging) await caches.delete(staging);
  }
}

self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port || !event.source?.url || !isHome(new URL(event.source.url))) return;
  event.waitUntil((async () => {
    try {
      const type = event.data?.type;
      if (type === 'PREPARE') {
        if (preparing) throw new Error('另一个窗口正在准备离线资源，请稍后重试。');
        controller = new AbortController();
        preparing = prepare(port, controller.signal);
        try { port.postMessage({ done: true, ...await preparing }); }
        finally { preparing = null; controller = null; }
      } else if (type === 'CANCEL' || type === 'CLEAR') {
        controller?.abort();
        await preparing?.catch(() => {});
        if (type === 'CLEAR') await clear();
        port.postMessage({ done: true, ready: false });
      } else if (type === 'STATUS') {
        const saved = await state();
        port.postMessage({ done: true, ready: await complete(saved), version: saved?.version, bytes: saved?.bytes, preparedAt: saved?.preparedAt });
      }
    } catch (error) {
      port.postMessage({ done: true, error: error.name === 'AbortError' ? '已取消，原有离线版本不受影响。' : error.message || '离线准备失败，请重试。' });
    }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.origin === 'https://fonts.googleapis.com') {
    event.respondWith((async () => {
      try {
        const client = await self.clients.get(event.clientId);
        const saved = client && isHome(new URL(client.url)) ? await state() : null;
        if (saved && await (await caches.open(saved.cache)).match('/fonts/report-space-grotesk-v1.ttf')) {
          return new Response('@font-face{font-family:"Space Grotesk";font-style:normal;font-weight:300 700;font-display:swap;src:url("' + self.location.origin + '/fonts/report-space-grotesk-v1.ttf") format("truetype")}', { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
        }
      } catch { /* Online fonts remain optional. */ }
      return fetch(request);
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && isHome(url)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        // Never substitute protected content for a real server response. Seeing
        // the lock screen online also revokes this device's offline copy.
        if (response.ok && (await response.clone().text()).includes('id="solar-password"')) await clear().catch(() => {});
        return response;
      } catch {
        try {
          const saved = await state();
          if (await complete(saved)) return (await caches.open(saved.cache)).match(HOME);
        } catch { /* Storage can be disabled or evicted. Show recovery, not a crash. */ }
        return new Response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sol&Tide · 需要联网</title><body style="font:18px system-ui;padding:40px;color:#073c3e"><h1>暂时无法离线打开</h1><p>离线资源尚未准备完成，或已被浏览器清除。请联网后输入密码，重新启用离线使用。</p><a href="/solar-analysis">重新打开</a></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
  } else if (allowedAsset(url.pathname) && (!url.search || (url.pathname.startsWith('/_next/static/') && [...url.searchParams.keys()].every(key => key === 'dpl')))) {
    event.respondWith((async () => {
      try {
        const client = await self.clients.get(event.clientId);
        if (client && isHome(new URL(client.url))) {
          const saved = await state();
          if (saved) {
            const hit = await (await caches.open(saved.cache)).match(url.pathname);
            if (hit) return hit;
            for (const name of (await caches.keys()).filter(n => n.startsWith(PREFIX + 'data-') && n !== saved.cache)) {
              const old = await (await caches.open(name)).match(url.pathname);
              if (old) return old;
            }
          }
        }
      } catch { /* Cache failures must not break the online website. */ }
      return fetch(request);
    })());
  }
});
