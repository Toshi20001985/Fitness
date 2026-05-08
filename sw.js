// キャッシュバージョン（GitHub Actionsが自動更新）
const CACHE_VERSION = 'v20260509-daily-reset';
const CACHE_NAME = `fittracker-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './sw.js'
];

// インストール：コアアセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names =>
        Promise.all(
          names
            .filter(n => n.startsWith('fittracker-') && n !== CACHE_NAME)
            .map(n => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// フェッチ：ナビゲーションはネットワーク優先、その他はキャッシュ優先
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    // HTMLはネットワーク優先（常に最新を取得）
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(c => c || caches.match('./index.html'))
        )
    );
    return;
  }

  // その他：キャッシュ優先、なければネットワーク取得してキャッシュ
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            // 同一オリジンのみキャッシュ（CDNはopaque responseのため制限）
            try { cache.put(request, clone); } catch {}
          });
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
