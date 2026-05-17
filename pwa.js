const serviceWorkerUrl = new URL("./service-worker.js", import.meta.url);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register(serviceWorkerUrl.href);
    } catch (error) {
      console.error("Care Queue service worker registration failed:", error);
    }
  });
}
