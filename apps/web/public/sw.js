/**
 * Offline is not an error state here: the notes, the search index and the model all live on this
 * device, so the only thing a network is ever needed for is fetching the application itself. This
 * keeps a copy of that.
 *
 * One file is precached, the document, and nothing else is. Everything else this app loads it loads
 * on the first visit anyway: the shell, the WebAssembly, the model runtime. Caching those as they
 * are fetched costs no extra bandwidth, where a precache list would download thirteen megabytes
 * before the first note was written.
 */
/**
 * One cache per build, named by the version the page registered this worker with.
 *
 * Next's own chunks are content-addressed, so a new build asks for new URLs and the old ones simply
 * go unread. The runtime is not: `/pglite/pglite.wasm` and `/ort/*.wasm` keep their names for ever,
 * and `asset` below answers from the cache before it asks the network. Under one fixed cache name a
 * reader who installed echo once would run that build's WebAssembly against every build after it.
 *
 * The name changing is what makes `activate` below delete the last one.
 */
const CACHE = `echo-${new URL(self.location.href).searchParams.get("v") ?? "dev"}`;

/**
 * The one file a first visit could never have cached for itself.
 *
 * Every subresource can be caught on the way past, but the document was fetched before this worker
 * existed, so a reader who installed echo and closed the tab came back offline to a browser error
 * page. Precaching it is 45KB, which is not the thirteen megabytes a full list would have been.
 *
 * It fails soft. A worker that installs while the network is already gone still activates, and the
 * next successful navigation writes the document itself.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add("/"))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

/**
 * The last build's cache goes. Nothing else does.
 *
 * `caches` is the whole origin's, not this worker's, and transformers.js keeps the ~120MB of model
 * weights in one of its own named `transformers-cache`. Deleting every name that was not this one
 * threw those away on every release: an update was also a re-download, and an update taken offline
 * was semantic search dropping back to words with nothing to say about why.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("echo-") && name !== CACHE)
            .map(caches.delete, caches),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** The document, freshest first: a stale shell would pin the reader to an old build forever. */
const document_ = async (request) => {
  /**
   * Keyed by path rather than by request, and there are two reasons, one for each half of that.
   *
   * This export has two documents, and caching both under `/` meant a single visit to the sticky
   * note replaced the application at the root with a sticky note that had nothing to talk to. The
   * query goes because the sticky note carries the note's id in its own, which would otherwise
   * write one copy of the same document per note ever pinned.
   */
  const key = new URL(request.url).pathname;
  try {
    const response = await fetch(request);
    /**
     * A host mid-deploy answers, and answers 503. Storing that would serve the error page from disk
     * for ever after, so the copy already there wins instead: nothing this application needs was on
     * the server to begin with.
     */
    if (!response.ok) return (await caches.match(key)) ?? response;
    const cache = await caches.open(CACHE);
    await cache.put(key, response.clone());
    return response;
  } catch {
    const cached = await caches.match(key);
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

/**
 * What the first visit had already fetched before this worker could answer for it.
 *
 * Registration is a blocking script in the document head, but installing and claiming still takes
 * long enough that the preload scanner has the stylesheet, the fonts and the first chunks on the
 * way down before any of it can be intercepted. The page posts its own resource timeline once this
 * is controlling, which is that list exactly.
 *
 * One at a time, and it matters. Asking for all twenty in parallel while the page is still pulling
 * its own megabytes down the same connection dropped the two largest every time, silently, because
 * a failed `add` is a background task nobody is waiting on. Nothing here is urgent enough to race
 * the application that is loading.
 */
const warm = async (urls) => {
  const cache = await caches.open(CACHE);
  for (const url of urls) {
    if (typeof url !== "string" || !url.startsWith(`${self.location.origin}/`)) continue;
    if (await cache.match(url)) continue;
    await cache.add(url).catch(() => {});
  }
};

self.addEventListener("message", (event) => {
  if (event.data?.type !== "warm" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(warm(event.data.urls));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(request.mode === "navigate" ? document_(request) : asset(request));
});
