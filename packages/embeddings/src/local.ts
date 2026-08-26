import { EMBEDDING_DIMENSIONS, type Embedder, type EmbedderStatus, normalize } from "./index";

const MODEL_ID = "Xenova/multilingual-e5-small";

/** e5 models expect their inputs prefixed by role; without it, retrieval quality drops sharply. */
type Role = "query" | "passage";

type Pipeline = (
  input: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

/** What transformers.js reports while it fetches the weights. Every field is optional on purpose. */
type LoadProgress = {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
};

/**
 * The local embedding runtime: a small multilingual model that runs in the browser, downloaded once
 * and cached by the browser afterwards. No API key, no request per note, and notes in any language
 * land in the same space.
 *
 * The download is around 120MB the first time, which is a real wait on a real connection. It is
 * reported rather than hidden: `onStatus` fires as the weights arrive, so the interface can say what
 * is happening instead of looking broken. Nothing else in the product waits for it.
 *
 * ponytail: runs wherever it is constructed. The web app builds it inside a worker so the model
 * never shares a thread with the editor.
 */
export const createLocalEmbedder = ({
  runtimePath,
  onStatus,
}: {
  runtimePath?: string;
  onStatus?: (status: EmbedderStatus) => void;
} = {}): Embedder => {
  let pipelinePromise: Promise<Pipeline> | undefined;
  /** Bytes seen per file, because the weights arrive as several downloads at once. */
  const received = new Map<string, { loaded: number; total: number }>();

  const reportDownload = (progress: LoadProgress): void => {
    if (!progress.file || progress.total === undefined) return;
    received.set(progress.file, {
      loaded: progress.loaded ?? 0,
      total: progress.total,
    });

    let loaded = 0;
    let total = 0;
    for (const file of received.values()) {
      loaded += file.loaded;
      total += file.total;
    }
    onStatus?.({ state: "loading", progress: total === 0 ? 0 : Math.min(1, loaded / total) });
  };

  const getPipeline = async (): Promise<Pipeline> => {
    if (!pipelinePromise) {
      onStatus?.({ state: "loading", progress: 0 });
      // A failed load is forgotten, so a dropped connection costs one retry rather than the whole
      // session: a cached rejected promise would keep failing instantly, forever.
      pipelinePromise = import("@huggingface/transformers").then(async ({ env, pipeline }) => {
        // The runtime is served by the app itself; nothing here reaches for a CDN.
        const wasm = env.backends.onnx.wasm;
        if (runtimePath && wasm) wasm.wasmPaths = runtimePath;
        const extractor = await pipeline("feature-extraction", MODEL_ID, {
          progress_callback: reportDownload,
        });
        onStatus?.({ state: "ready" });
        return extractor as unknown as Pipeline;
      });
    }
    try {
      return await pipelinePromise;
    } catch (cause) {
      pipelinePromise = undefined;
      received.clear();
      onStatus?.({
        state: "unavailable",
        reason: cause instanceof Error ? cause.message : "The model could not be loaded",
      });
      throw cause;
    }
  };

  const run = async (texts: string[], role: Role): Promise<Float32Array[]> => {
    if (texts.length === 0) return [];
    const extractor = await getPipeline();
    const output = await extractor(
      texts.map((text) => `${role}: ${text}`),
      { pooling: "mean", normalize: true },
    );
    return output.tolist().map((values) => normalize(Float32Array.from(values)));
  };

  return {
    id: MODEL_ID,
    dimensions: EMBEDDING_DIMENSIONS,
    /** Starts the download without asking for anything, so the first real request is not the wait. */
    warm: () => getPipeline().then(() => undefined),
    async embed(text) {
      const [vector] = await run([text], "passage");
      if (!vector) throw new Error("Embedding produced no vector");
      return vector;
    },
    embedMany(texts) {
      return run(texts, "passage");
    },
    async embedQuery(text) {
      const [vector] = await run([text], "query");
      if (!vector) throw new Error("Embedding produced no vector");
      return vector;
    },
  };
};
