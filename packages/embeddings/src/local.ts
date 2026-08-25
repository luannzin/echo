import { EMBEDDING_DIMENSIONS, type Embedder, normalize } from "./index";

const MODEL_ID = "Xenova/multilingual-e5-small";

/** e5 models expect their inputs prefixed by role; without it, retrieval quality drops sharply. */
type Role = "query" | "passage";

type Pipeline = (
  input: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

/**
 * The local embedding runtime: a small multilingual model that runs in the browser, downloaded once
 * and cached by the browser afterwards. No API key, no request per note, and notes in any language
 * land in the same space.
 *
 * ponytail: runs wherever it is constructed. The web app builds it inside a worker so the model
 * never shares a thread with the editor.
 */
export function createLocalEmbedder({ runtimePath }: { runtimePath?: string } = {}): Embedder {
  let pipelinePromise: Promise<Pipeline> | undefined;

  async function getPipeline(): Promise<Pipeline> {
    if (!pipelinePromise) {
      // A failed load is forgotten, so a dropped connection costs one retry rather than the whole
      // session: a cached rejected promise would keep failing instantly, forever.
      pipelinePromise = import("@huggingface/transformers").then(async ({ env, pipeline }) => {
        // The runtime is served by the app itself; nothing here reaches for a CDN.
        const wasm = env.backends.onnx.wasm;
        if (runtimePath && wasm) wasm.wasmPaths = runtimePath;
        const extractor = await pipeline("feature-extraction", MODEL_ID);
        return extractor as unknown as Pipeline;
      });
    }
    try {
      return await pipelinePromise;
    } catch (cause) {
      pipelinePromise = undefined;
      throw cause;
    }
  }

  async function run(texts: string[], role: Role): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const extractor = await getPipeline();
    const output = await extractor(
      texts.map((text) => `${role}: ${text}`),
      { pooling: "mean", normalize: true },
    );
    return output.tolist().map((values) => normalize(Float32Array.from(values)));
  }

  return {
    id: MODEL_ID,
    dimensions: EMBEDDING_DIMENSIONS,
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
}
