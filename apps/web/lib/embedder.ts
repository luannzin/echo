import { EMBEDDING_DIMENSIONS, type Embedder } from "@echo/embeddings";

type Pending = { resolve: (values: Float32Array) => void; reject: (error: Error) => void };

/**
 * Main-thread half of the embedding runtime: it owns no model, only a worker and a promise per
 * request. The model downloads on first use and the browser caches it afterwards.
 */
export function createWorkerEmbedder(): Embedder {
  const pending = new Map<number, Pending>();
  let worker: Worker | undefined;
  let nextId = 0;

  function ensureWorker(): Worker {
    if (!worker) {
      worker = new Worker(new URL("./embedder.worker.ts", import.meta.url), { type: "module" });
      worker.addEventListener(
        "message",
        (event: MessageEvent<{ id: number; values?: Float32Array; error?: string }>) => {
          const waiting = pending.get(event.data.id);
          if (!waiting) return;
          pending.delete(event.data.id);
          if (event.data.values) waiting.resolve(event.data.values);
          else waiting.reject(new Error(event.data.error ?? "Embedding failed"));
        },
      );
    }
    return worker;
  }

  function request(text: string, role: "passage" | "query"): Promise<Float32Array> {
    const id = nextId++;
    return new Promise<Float32Array>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ensureWorker().postMessage({ id, role, text });
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
  };
}
