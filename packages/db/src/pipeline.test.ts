import { expect, test } from "bun:test";
import { createAnalyzer, createEcho } from "@echo/core";
import type { Embedder } from "@echo/embeddings";
import { normalize } from "@echo/embeddings";
import { createVectorIndex } from "@echo/search";
import { openRepositories } from "./index";

/**
 * A stand-in for the real model: deterministic, offline, and just semantic enough to prove the
 * pipeline. Notes sharing words end up pointing the same way, which is all these assertions need.
 */
const stubEmbedder: Embedder = {
  id: "stub-bag-of-words",
  dimensions: 16,
  async embed(text) {
    const values = new Float32Array(16);
    for (const word of text.toLowerCase().match(/[\p{L}]+/gu) ?? []) {
      let hash = 0;
      for (const character of word) hash = (hash * 31 + character.charCodeAt(0)) % 16;
      values[hash] = (values[hash] as number) + 1;
    }
    return normalize(values);
  },
  async embedMany(texts) {
    return Promise.all(texts.map((text) => this.embed(text)));
  },
  embedQuery(text) {
    return this.embed(text);
  },
};

test("writing a note leads to an embedding, and to a related note", async () => {
  const { repositories } = await openRepositories();
  const echo = createEcho({ repositories });
  const analyzer = createAnalyzer({
    notes: repositories.notes,
    embeddings: repositories.embeddings,
    embedder: stubEmbedder,
    events: echo.events,
  });

  const cache = await echo.notes.create({ content: "cache invalidation in the merchant system" });
  const production = await echo.notes.create({ content: "cache problem in production merchant" });
  await echo.notes.create({ content: "ideias de jantar para domingo" });

  await analyzer.run();

  const stored = await repositories.embeddings.list(stubEmbedder.id);
  expect(stored).toHaveLength(3);
  expect(await repositories.embeddings.pending(stubEmbedder.id)).toEqual([]);

  const query = await stubEmbedder.embedQuery("merchant cache");
  const index = createVectorIndex(stubEmbedder.dimensions);
  index.load(stored);

  const related = index.nearest(query, { minimumSimilarity: 0.3, limit: 2 });
  expect(related.map((match) => match.noteId).sort()).toEqual([cache.id, production.id].sort());

  analyzer.stop();
});

test("every vector is published as it is written, so an index never needs re-reading", async () => {
  const { repositories } = await openRepositories();
  const echo = createEcho({ repositories });
  const index = createVectorIndex(stubEmbedder.dimensions);
  const analyzer = createAnalyzer({
    notes: repositories.notes,
    embeddings: repositories.embeddings,
    embedder: stubEmbedder,
    events: echo.events,
    onEmbedded: ({ noteId, values }) => index.put(noteId, values),
  });

  // More notes than one batch holds, so the batching path is the one under test.
  const created = [];
  for (let n = 0; n < 11; n++) {
    created.push(await echo.notes.create({ content: `assunto numero ${n} sobre estoque` }));
  }
  await analyzer.run();

  expect(index.size).toBe(11);
  const stored = await repositories.embeddings.list(stubEmbedder.id);
  expect(stored).toHaveLength(11);
  // What the index holds is what the database holds — not an approximation of it.
  for (const entry of stored) {
    expect(index.scoreOf(entry.values, entry.noteId)).toBeCloseTo(1, 5);
  }

  analyzer.stop();
});

test("editing a note re-queues it and the new text replaces the old vector", async () => {
  const { repositories } = await openRepositories();
  const echo = createEcho({ repositories });
  const analyzer = createAnalyzer({
    notes: repositories.notes,
    embeddings: repositories.embeddings,
    embedder: stubEmbedder,
    events: echo.events,
  });

  const note = await echo.notes.create({ content: "primeiro assunto" });
  await analyzer.run();
  const [before] = await repositories.embeddings.list(stubEmbedder.id);

  await echo.notes.saveContent(note.id, "assunto completamente diferente sobre estoque");
  expect(await repositories.embeddings.pending(stubEmbedder.id)).toEqual([note.id]);

  await analyzer.run();
  const [after] = await repositories.embeddings.list(stubEmbedder.id);

  expect([...(after?.values ?? [])]).not.toEqual([...(before?.values ?? [])]);
  expect(await repositories.embeddings.pending(stubEmbedder.id)).toEqual([]);

  analyzer.stop();
});

test("a failing model leaves the queue intact for the next attempt", async () => {
  const { repositories } = await openRepositories();
  const echo = createEcho({ repositories });
  const failures: string[] = [];
  const analyzer = createAnalyzer({
    notes: repositories.notes,
    embeddings: repositories.embeddings,
    embedder: {
      ...stubEmbedder,
      embed: () => Promise.reject(new Error("model unavailable")),
    },
    events: echo.events,
    onProgress: (state) => state.error && failures.push(state.error),
  });

  const note = await echo.notes.create({ content: "nota que nao consegue ser embedada" });
  await analyzer.run();

  expect(failures).toEqual(["model unavailable"]);
  expect(await repositories.embeddings.pending(stubEmbedder.id)).toEqual([note.id]);

  analyzer.stop();
});
