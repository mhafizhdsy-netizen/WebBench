/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (!ev.data) {
      return;
    } else if (ev.data.type === "deregister") {
      self.registration.unregister().then(() => {
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach((client) => client.navigate(client.url));
      });
    } else if (ev.data.type === "coepCredentialless") {
      coepCredentialless = ev.data.value;
    }
  });

  self.addEventListener("fetch", function (event) {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
          if (!newHeaders.get("Cross-Origin-Opener-Policy")) {
            newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          }

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepCredentialless = false;

    if (window.navigator && window.navigator.serviceWorker && window.navigator.serviceWorker.controller) {
      window.navigator.serviceWorker.controller.postMessage({
        type: "coepCredentialless",
        value: coepCredentialless,
      });
    }

    window.navigator.serviceWorker &&
      !reloadedBySelf &&
      !window.crossOriginIsolated &&
      window.navigator.serviceWorker.register(window.document.currentScript.src).then(
        (registration) => {
          console.log("COI Service Worker registered to enable Cross-Origin Isolation");
          registration.addEventListener("updatefound", () => {
            window.location.reload();
          });

          if (registration.active && !window.navigator.serviceWorker.controller) {
            window.location.reload();
          }
        },
        (err) => {
          console.error("COI Service Worker registration failed: ", err);
        }
      );
    
    // Auto-reload if not isolated, to apply the service worker
    if (!window.crossOriginIsolated && !reloadedBySelf) {
        window.sessionStorage.setItem("coiReloadedBySelf", "true");
        window.location.reload();
    }
  })();
}
