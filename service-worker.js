const CACHE_PREFIX = "carequeue-";
const CACHE_NAME = `${CACHE_PREFIX}pwa-v2`;
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./pwa.js",
  "./Login/style.css",
  "./Login/login.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
].map(path => new URL(path, self.location).href);

const APP_SHELL_FALLBACK = new URL("./index.html", self.location).href;
const STATIC_DESTINATIONS = new Set(["style", "script", "image", "font", "manifest"]);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(cacheName => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (!["http:", "https:"].includes(requestUrl.protocol)) {
    return;
  }

  if (request.mode === "navigate" && requestUrl.origin === self.location.origin) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (STATIC_DESTINATIONS.has(request.destination)) {
    event.respondWith(handleStaticRequest(request));
  }
});

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response);
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return caches.match(APP_SHELL_FALLBACK);
  }
}

async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  const fetchPromise = fetch(request)
    .then(async response => {
      await cacheResponse(request, response);
      return response;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response("Offline", {
    status: 503,
    statusText: "Offline"
  });
}

async function cacheResponse(request, response) {
  if (!response || (!response.ok && response.type !== "opaque")) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}
