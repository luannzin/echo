import { expect, test } from "bun:test";
import { createAnalyzer, createEcho } from "@echo/core";
import type { Embedder } from "@echo/embeddings";
import { normalize } from "@echo/embeddings";
import { relatedTo } from "@echo/search";
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
  const byId = new Map((await echo.notes.list()).map((note) => [note.id, note]));
  const candidates = stored.flatMap((entry) => {
    const note = byId.get(entry.noteId);
    return note ? [{ note, embedding: entry.values }] : [];
  });

  const related = relatedTo(query, candidates, { minimumSimilarity: 0.3 });
  expect(
    related
      .map((result) => result.note.id)
      .slice(0, 2)
      .sort(),
  ).toEqual([cache.id, production.id].sort());

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
