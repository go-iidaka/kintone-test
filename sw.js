// Service Worker（PWA用）
// - アプリの“殻”（HTML/CSS/JS/アイコン）をキャッシュしてオフラインでも起動しやすくする
// - CSV/JSON は更新されやすいので「ネット優先」で取得し、失敗時にキャッシュを使う

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./explanations.json",
  "./result.csv",
  "./result%20(1).csv",
  "./result%20(2).csv"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("app-shell-") && k !== APP_SHELL_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 同一オリジンのみ扱う
  if (url.origin !== location.origin) return;

  // CSV/JSON は「ネット優先 → ダメならキャッシュ」
  if (url.pathname.endsWith(".csv") || url.pathname.endsWith(".json")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(APP_SHELL_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || new Response("offline", { status: 503 });
      }
    })());
    return;
  }

  // それ以外（HTML/CSS/JS/アイコン等）は「キャッシュ優先」
  event.respondWith((async () => {
    const cached = await caches.match(req);
    return cached || fetch(req);
  })());
});
