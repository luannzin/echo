import { EMBEDDING_DIMENSIONS, type Embedder, type EmbedderStatus } from "@echo/embeddings";

type Pending = { resolve: (values: Float32Array) => void; reject: (error: Error) => void };

/**
 * How long the model may sit in memory with nothing to do.
 *
 * The weights and the runtime that runs them are hundreds of megabytes of WebAssembly, and a
 * WebAssembly heap only ever grows — nothing inside the worker can hand any of it back. Ending the
 * worker hands back all of it, and the analyzer works in bursts: it wakes a few seconds after the
 * writing stops, catches up, and then has nothing to say for hours.
 *
 * Coming back costs a reload from the browser's own cache, not the 120MB download. The first search
 * after a long silence pays it; nothing else in the product waits on the model at all.
 */
const IDLE_MS = 60_000;

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
 * request. Nothing here waits on the model to decide what the interface can do — the status is
 * published and every caller is expected to work without it.
 */
export const createWorkerEmbedder = (): WorkerEmbedder => {
  const pending = new Map<number, Pending>();
  const listeners = new Set<(status: EmbedderStatus) => void>();
  let latest: EmbedderStatus = { state: "idle" };
  let worker: Worker | undefined;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let nextId = 0;

  const publish = (status: EmbedderStatus): void => {
    latest = status;
    for (const listener of listeners) listener(status);
  };

  /**
   * Ends the worker once nothing has been asked of it for a while. The status is deliberately left
   * alone: it says whether the model is *available*, not whether it happens to be resident, and the
   * next request brings it straight back.
   */
  const restIdle = (): void => {
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => {
      idle = undefined;
      if (pending.size > 0 || !worker) return;
      worker.terminate();
      worker = undefined;
    }, IDLE_MS);
  };

  const onMessage = (event: MessageEvent<WorkerMessage>): void => {
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
    if (pending.size === 0) restIdle();
  };

  /** A worker that dies takes every outstanding request with it, and a promise that never settles
   *  is the one failure an interface cannot show. */
  const onError = (event: ErrorEvent): void => {
    const reason = event.message || "The local model could not be started";
    publish({ state: "unavailable", reason });
    for (const [id, waiting] of pending) {
      pending.delete(id);
      waiting.reject(new Error(reason));
    }
  };

  const ensureWorker = (): Worker => {
    if (idle) {
      clearTimeout(idle);
      idle = undefined;
    }
    if (!worker) {
      worker = new Worker(new URL("./embedder.worker.ts", import.meta.url), { type: "module" });
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
    }
    return worker;
  };

  const request = (text: string, role: "passage" | "query"): Promise<Float32Array> => {
    const id = nextId++;
    return new Promise<Float32Array>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ensureWorker().postMessage({ kind: "embed", id, role, text });
    });
  };

  return {
    id: "Xenova/multilingual-e5-small",
    dimensions: EMBEDDING_DIMENSIONS,
    embed: (text) => request(text, "passage"),
    embedQuery: (text) => request(text, "query"),
    embedMany: async (texts) => {
      const values: Float32Array[] = [];
      for (const text of texts) values.push(await request(text, "passage"));
      return values;
    },
    warm: async () => {
      ensureWorker().postMessage({ kind: "warm" });
      // Warming is not a request, so nothing else will ever start the clock on it. An install that
      // opens the app and writes nothing must not hold the model for the rest of the session.
      restIdle();
    },
    status: () => latest,
    onStatus: (listener) => {
      listener(latest);
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
