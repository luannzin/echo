export type VectorMatch = { noteId: string; similarity: number };

export type NearestOptions = {
  limit?: number;
  /** Matches below this are not answers. Comparing everything to everything always finds something. */
  minimumSimilarity?: number;
  /** The note being written or read, which is never its own related note. */
  excludeNoteId?: string;
};

/**
 * Every note's vector, held in memory for as long as the app is open.
 *
 * Reading them back from the database was costing 440ms at two thousand notes, and it was happening
 * on every search and every pause in typing — the compute was already free (5ms), the storage round
 * trip was the whole cost. Vectors are small, bounded by the note count, and derived data anyway:
 * keeping them resident is what turns retrieval from a query into a calculation.
 *
 * They live in one contiguous `Float32Array` rather than an array of arrays. At ten thousand notes
 * that is one allocation of 15MB instead of ten thousand small ones, and the scan walks memory in
 * order, which is the difference between a comparison that costs a frame and one that does not.
 */
export type VectorIndex = ReturnType<typeof createVectorIndex>;

export function createVectorIndex(dimensions: number) {
  /** Row `n` of the matrix occupies `[n * dimensions, (n + 1) * dimensions)`. */
  let matrix = new Float32Array(0);
  /** Which note owns each row. Rows are dense: there are never holes to skip. */
  let ids: string[] = [];
  const rowOf = new Map<string, number>();

  /**
   * Cosine similarity against one row, read straight out of the matrix. Both sides are unit
   * vectors, so the dot product is the cosine — and reading in place means comparing every note in
   * the index allocates nothing at all.
   */
  function scoreRow(query: Float32Array, index: number): number {
    const offset = index * dimensions;
    let dot = 0;
    for (let d = 0; d < dimensions; d++) {
      dot += (query[d] as number) * (matrix[offset + d] as number);
    }
    return dot;
  }

  function grow(rows: number): void {
    if (rows * dimensions <= matrix.length) return;
    // Doubling, so filling the index from empty stays linear rather than quadratic.
    const capacity = Math.max(rows, ids.length * 2, 64);
    const grown = new Float32Array(capacity * dimensions);
    grown.set(matrix);
    matrix = grown;
  }

  function write(index: number, values: Float32Array): void {
    if (values.length !== dimensions) {
      throw new Error(`Expected ${dimensions} dimensions, received ${values.length}`);
    }
    matrix.set(values, index * dimensions);
  }

  return {
    get size(): number {
      return ids.length;
    },

    has(noteId: string): boolean {
      return rowOf.has(noteId);
    },

    /** Replaces the whole index in one pass — the shape of the first read after the app opens. */
    load(entries: readonly { noteId: string; values: Float32Array }[]): void {
      matrix = new Float32Array(entries.length * dimensions);
      ids = new Array(entries.length);
      rowOf.clear();
      entries.forEach((entry, index) => {
        ids[index] = entry.noteId;
        rowOf.set(entry.noteId, index);
        write(index, entry.values);
      });
    },

    /** One note's vector, new or replacing the one already there. */
    put(noteId: string, values: Float32Array): void {
      const existing = rowOf.get(noteId);
      if (existing !== undefined) {
        write(existing, values);
        return;
      }
      grow(ids.length + 1);
      const index = ids.length;
      ids.push(noteId);
      rowOf.set(noteId, index);
      write(index, values);
    },

    /**
     * Removing a note moves the last row into its place. Order carries no meaning here — every row
     * is compared to the query anyway — so a swap beats shifting everything after it.
     */
    remove(noteId: string): void {
      const index = rowOf.get(noteId);
      if (index === undefined) return;
      const last = ids.length - 1;
      if (index !== last) {
        matrix.copyWithin(index * dimensions, last * dimensions, (last + 1) * dimensions);
        const moved = ids[last] as string;
        ids[index] = moved;
        rowOf.set(moved, index);
      }
      ids.pop();
      rowOf.delete(noteId);
    },

    /**
     * The notes closest in meaning to a vector, best first.
     *
     * Results are kept in a list the length of the answer rather than sorted at the end: with a
     * limit of eight, that is eight comparisons per candidate in the worst case and none in the
     * common one, where a note is simply not good enough to enter.
     */
    nearest(query: Float32Array, options: NearestOptions = {}): VectorMatch[] {
      const { limit = 5, minimumSimilarity = 0, excludeNoteId } = options;
      if (limit <= 0 || ids.length === 0) return [];
      if (query.length !== dimensions) {
        throw new Error(`Expected ${dimensions} dimensions, received ${query.length}`);
      }

      const best: VectorMatch[] = [];
      let floor = minimumSimilarity;

      for (let index = 0; index < ids.length; index++) {
        const noteId = ids[index] as string;
        if (noteId === excludeNoteId) continue;

        const score = scoreRow(query, index);
        if (score < floor) continue;

        let at = best.length;
        while (at > 0 && (best[at - 1] as VectorMatch).similarity < score) at--;
        best.splice(at, 0, { noteId, similarity: score });
        if (best.length > limit) best.pop();
        // Once the answer is full, only a note better than its weakest member can matter.
        if (best.length === limit) {
          floor = Math.max(minimumSimilarity, (best[limit - 1] as VectorMatch).similarity);
        }
      }

      return best;
    },

    /** The similarity between a query and one particular note, or undefined if it has no vector. */
    scoreOf(query: Float32Array, noteId: string): number | undefined {
      const index = rowOf.get(noteId);
      return index === undefined ? undefined : scoreRow(query, index);
    },
  };
}
