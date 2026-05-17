const CACHE_PREFIX = "carequeue-";
const CACHE_NAME = `${CACHE_PREFIX}pwa-v2`;

//files needed for the app to load when offline.
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./pwa.js",
  "./Login/style.css",
  "./Login/login.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
].map(path => new URL(path, self.location).href);

// index page is used as a fallback when the user is offline
const APP_SHELL_FALLBACK = new URL("./index.html", self.location).href;

// Only these types of static files will be handled by the cache logic.
const STATIC_DESTINATIONS = new Set(["style", "script", "image", "font", "manifest"]);

// Runs when the service worker is first installed and opens the cache and stores the app shell files
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await cache.addAll(APP_SHELL);

    //Activate this service worker immediately instead of waiting.
    await self.skipWaiting();
  })());
});

// Runs when the service worker becomes active.
// It removes old CareQueue caches so the browser does not keep outdated files.
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames
        .filter(cacheName => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
    );

    // Allows the active service worker to control open pages immediately.
    await self.clients.claim();
  })());
});

// Runs every time the app makes a network request.
// This decides whether the request should be handled by the service worker.
self.addEventListener("fetch", event => {
  const { request } = event;

  // Only GET requests are cached.
  // Requests like POST, PUT, and DELETE should go straight to the network.
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  // Ignore requests that are not normal web requests.
  if (!["http:", "https:"].includes(requestUrl.protocol)) {
    return;
  }

  // Handle page navigation requests, such as opening index.html or dashboard pages.
  if (request.mode === "navigate" && requestUrl.origin === self.location.origin) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static files like CSS, JavaScript, images, fonts, and the manifest.
  if (STATIC_DESTINATIONS.has(request.destination)) {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handles page requests.
// It tries the network first so the user gets the latest page.
// If the network fails, it tries to use a cached version.
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

    // If the exact page is not cached, show the fallback page.
    return caches.match(APP_SHELL_FALLBACK);
  }
}


// It returns the cached file first if available.
// At the same time, it tries to fetch a newer version and update the cache.
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

  // This is returned only when the file is not cached and the network is unavailable.
  return new Response("Offline", {
    status: 503,
    statusText: "Offline"
  });
}

// Saves a successful response in the current cache.
// The response is cloned because a response can only be read once.
async function cacheResponse(request, response) {
  if (!response || (!response.ok && response.type !== "opaque")) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);

  await cache.put(request, response.clone());
}