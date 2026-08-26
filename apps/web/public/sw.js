/**
 * Offline is not an error state here: the notes, the search index and the model all live on this
 * device, so the only thing a network is ever needed for is fetching the application itself. This
 * keeps a copy of that.
 *
 * Nothing is precached. Everything this app loads it loads on the first visit anyway — the shell,
 * the WebAssembly, the model runtime — so caching them as they are fetched costs one visit and no
 * extra bandwidth, where a precache list would download thirteen megabytes before the first note
 * was written.
 */
const CACHE = "echo-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map(caches.delete, caches)),
      )
      .then(() => self.clients.claim()),
  );
});

/** The document, freshest first: a stale shell would pin the reader to an old build forever. */
const document_ = async (request) => {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE);
    await cache.put("/", response.clone());
    return response;
  } catch {
    const cached = await caches.match("/");
    if (cached) return cached;
    throw new Error("offline and no cached shell");
  }
};

/** Everything else is content-addressed or immutable, so the copy on disk is the right answer. */
const asset = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(request.mode === "navigate" ? document_(request) : asset(request));
});
