export const EMBEDDING_DIMENSIONS = 384;

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
}

/** Cosine similarity for unit-length vectors, which is what both sides of a comparison are. */
export function similarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error("Vectors of different widths cannot be compared");
  let dot = 0;
  for (let index = 0; index < a.length; index++) {
    dot += (a[index] as number) * (b[index] as number);
  }
  return dot;
}

export function normalize(vector: Float32Array): Float32Array {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const length = Math.sqrt(sum);
  if (length === 0) return vector;
  const unit = new Float32Array(vector.length);
  for (let index = 0; index < vector.length; index++) {
    unit[index] = (vector[index] as number) / length;
  }
  return unit;
}

export { createLocalEmbedder } from "./local";
