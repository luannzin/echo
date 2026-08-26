export const EMBEDDING_DIMENSIONS = 384;

/**
 * Where the model is up to. A local model is a download before it is a runtime, and "still arriving"
 * and "not coming" are a wait and a dead end — the interface has to be able to tell them apart.
 */
export type EmbedderStatus =
  | { state: "idle" }
  | { state: "loading"; progress: number }
  | { state: "ready" }
  | { state: "unavailable"; reason: string };

/**
 * The application never learns which model produced a vector, only how wide it is. Swapping the
 * runtime — worker, server, a different model — is implementing this interface again.
 */
export interface Embedder {
  /** Identifies which model wrote a stored vector, so a model change can invalidate them. */
  readonly id: string;
  readonly dimensions: number;
  /** Encodes a note's content for storage. */
  embed(text: string): Promise<Float32Array>;
  embedMany(texts: string[]): Promise<Float32Array[]>;
  /** Encodes a search query. Retrieval models treat queries and passages differently. */
  embedQuery(text: string): Promise<Float32Array>;
  /** Optional: begins loading the model before anything needs it. */
  warm?(): Promise<void>;
}

/** Cosine similarity for unit-length vectors, which is what both sides of a comparison are. */
export const similarity = (a: Float32Array, b: Float32Array): number => {
  if (a.length !== b.length) throw new Error("Vectors of different widths cannot be compared");
  let dot = 0;
  for (let index = 0; index < a.length; index++) {
    dot += (a[index] as number) * (b[index] as number);
  }
  return dot;
};

export const normalize = (vector: Float32Array): Float32Array => {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const length = Math.sqrt(sum);
  if (length === 0) return vector;
  const unit = new Float32Array(vector.length);
  for (let index = 0; index < vector.length; index++) {
    unit[index] = (vector[index] as number) / length;
  }
  return unit;
};

/**
 * The local runtime lives behind `@echo/embeddings/local` rather than here.
 *
 * It reaches for transformers.js, which reaches for an ONNX runtime, which in a server build reaches
 * for a native binary no browser bundler can read. Only the worker that runs the model needs any of
 * that; everything else needs the interface and the arithmetic, which is what this file is. Keeping
 * them apart is the difference between one module pulling in a model runtime and every module doing
 * it.
 */
