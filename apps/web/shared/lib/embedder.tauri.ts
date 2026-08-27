import { EMBEDDING_DIMENSIONS, type Embedder, type EmbedderStatus } from "@echo/embeddings";
import { invoke } from "@tauri-apps/api/core";

/**
 * Which model wrote a stored vector — the same id the browser runtime writes, because it is the
 * same model: the Rust side runs the same quantized ONNX from the same repository, one text at a
 * time, exactly as the worker does. That is deliberate and it is load-bearing. Were the two to
 * disagree, `pending` would re-queue every note on the first launch after a switch, and until it
 * finished the index would be holding vectors from two different spaces.
 */
const MODEL_ID = "Xenova/multilingual-e5-small";

/**
 * How much of a note is sent. The model reads 512 tokens and the Rust side truncates to them, but
 * it has to receive the note before it can drop most of it — this is the same generous ceiling the
 * browser runtime applies, kept here so a 40KB note does not cross the IPC boundary to be thrown
 * away on the other side.
 */
const MAX_CHARS = 4_000;

export type TauriEmbedder = Embedder & {
  onStatus: (listener: (status: EmbedderStatus) => void) => () => void;
  status: () => EmbedderStatus;
};

/**
 * The desktop's embedding runtime: no worker, no WebAssembly, no model in the webview at all.
 *
 * WebKitGTK leaks around fifty megabytes per inference and never returns any of it — measured, on
 * this app's own model, against a flat seven hundred megabytes for the identical loop under
 * Chromium. Nothing that can be written in the webview fixes that: recycling the worker pays four
 * gigabytes to reload the model, which is worse than the leak it is trying to bound. So the desktop
 * asks the Rust side, where the same model costs a few hundred megabytes and stays there.
 *
 * There is deliberately no `warm`: the browser runtime has one because starting a 120MB download
 * early is kinder than starting it under a search, and this runtime has nothing to download early
 * that would be visible — the model loads on the first note that needs it and stays loaded.
 */
export const createTauriEmbedder = (): TauriEmbedder => {
  const listeners = new Set<(status: EmbedderStatus) => void>();
  let latest: EmbedderStatus = { state: "idle" };
  /** The model is built once on the Rust side; this only tracks whether that has happened yet. */
  let loaded = false;

  const publish = (status: EmbedderStatus): void => {
    latest = status;
    for (const listener of listeners) listener(status);
  };

  const run = async (texts: string[], role: "passage" | "query"): Promise<Float32Array[]> => {
    if (texts.length === 0) return [];
    // The first call is also the model's download and load, and it is the only one worth announcing.
    if (!loaded) publish({ state: "loading" });
    try {
      const vectors = await invoke<number[][]>("embed", {
        role,
        texts: texts.map((text) => text.slice(0, MAX_CHARS)),
      });
      if (!loaded) {
        loaded = true;
        publish({ state: "ready" });
      }
      return vectors.map((values) => Float32Array.from(values));
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      // A model that cannot be built will not build itself on the next note either, but the reason
      // is usually a download — so the next request is allowed to try again rather than being
      // refused by a flag set here.
      publish({ state: "unavailable", reason });
      throw new Error(reason);
    }
  };

  const one = async (text: string, role: "passage" | "query"): Promise<Float32Array> => {
    const [vector] = await run([text], role);
    if (!vector) throw new Error("Embedding produced no vector");
    return vector;
  };

  return {
    id: MODEL_ID,
    dimensions: EMBEDDING_DIMENSIONS,
    embed: (text) => one(text, "passage"),
    embedQuery: (text) => one(text, "query"),
    // One crossing into Rust for the whole batch, which then embeds them one at a time on the other
    // side. The batching here is about the IPC boundary and nothing else — the model must see one
    // text per inference or dynamic quantization gives the same note a different vector depending
    // on what it was embedded alongside.
    embedMany: (texts) => run(texts, "passage"),
    status: () => latest,
    onStatus: (listener) => {
      listener(latest);
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
