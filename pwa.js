// Create the correct full URL to the service worker file.
const serviceWorkerUrl = new URL("./service-worker.js", import.meta.url);

// Check whether the browser supports service workers.
if ("serviceWorker" in navigator) {

  // Wait until the entire page has loaded before registering the service worker.
  window.addEventListener("load", async () => {

    try {

      // Register the service worker so it can start handling caching, offline support, and background tasks.
      await navigator.serviceWorker.register(serviceWorkerUrl.href);

    } catch (error) {

      // Log an error if the service worker fails to register.
      console.error("Care Queue service worker registration failed:", error);
    }
  });
}