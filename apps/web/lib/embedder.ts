import { EMBEDDING_DIMENSIONS, type Embedder, type EmbedderStatus } from "@echo/embeddings";

type Pending = { resolve: (values: Float32Array) => void; reject: (error: Error) => void };

type WorkerMessage =
  | { kind: "status"; status: EmbedderStatus }
  | { kind: "result"; id: number; values?: Float32Array; error?: string };

export type WorkerEmbedder = Embedder & {
  /** Where the model is up to, replayed to every new listener so nobody joins mid-download blind. */
  onStatus: (listener: (status: EmbedderStatus) => void) => () => void;
  status: () => EmbedderStatus;
};

/**
 * Main-thread half of the embedding runtime: it owns no model, only a worker and a promise per
 * request. The model downloads on first use and the browser caches it afterwards.
 *
 * Nothing here waits on the model to decide what the interface can do. The status is published, and
 * every caller is expected to work without it — search finds words while meaning is still loading,
 * and says so.
 */
export function createWorkerEmbedder(): WorkerEmbedder {
  const pending = new Map<number, Pending>();
  const listeners = new Set<(status: EmbedderStatus) => void>();
  let latest: EmbedderStatus = { state: "idle" };
  let worker: Worker | undefined;
  let nextId = 0;

  function publish(status: EmbedderStatus): void {
    latest = status;
    for (const listener of listeners) listener(status);
  }

  function ensureWorker(): Worker {
    if (!worker) {
      worker = new Worker(new URL("./embedder.worker.ts", import.meta.url), { type: "module" });
      worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        if (message.kind === "status") {
          publish(message.status);
          return;
        }
        const waiting = pending.get(message.id);
        if (!waiting) return;
        pending.delete(message.id);
        if (message.values) waiting.resolve(message.values);
        else waiting.reject(new Error(message.error ?? "Embedding failed"));
      });
      // A worker that dies takes every outstanding request with it. Left alone they would never
      // settle, and a promise that never settles is the one failure an interface cannot show.
      worker.addEventListener("error", (event) => {
        const reason = event.message || "The local model could not be started";
        publish({ state: "unavailable", reason });
        for (const [id, waiting] of pending) {
          pending.delete(id);
          waiting.reject(new Error(reason));
        }
      });
    }
    return worker;
  }

  function request(text: string, role: "passage" | "query"): Promise<Float32Array> {
    const id = nextId++;
    return new Promise<Float32Array>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ensureWorker().postMessage({ kind: "embed", id, role, text });
    });
  }

  return {
    id: "Xenova/multilingual-e5-small",
    dimensions: EMBEDDING_DIMENSIONS,
    embed: (text) => request(text, "passage"),
    embedQuery: (text) => request(text, "query"),
    async embedMany(texts) {
      const values: Float32Array[] = [];
      for (const text of texts) values.push(await request(text, "passage"));
      return values;
    },
    async warm() {
      ensureWorker().postMessage({ kind: "warm" });
    },
    status: () => latest,
    onStatus(listener) {
      listener(latest);
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
