/**
 * The perf pass `docs/PLAN.md` holds open: a seeded corpus, measured against the operations the
 * interface actually performs, with no browser in the way.
 *
 * Notes are written straight through SQL rather than the service, so seeding ten thousand of them
 * is a handful of inserts and not ten thousand events. Vectors are random unit vectors: the index
 * does not care what they mean, only how many there are and how wide.
 *
 *   bun scripts/bench.ts          ten thousand notes
 *   bun scripts/bench.ts 2000     a smaller corpus
 */
import { randomUUID } from "node:crypto";
import { createEcho } from "@echo/core";
import { openRepositories } from "@echo/db";
import { EMBEDDING_DIMENSIONS } from "@echo/embeddings";
import { createVocabulary } from "@echo/learning";
import { createVectorIndex, suggestDestinations } from "@echo/search";
import { DEFAULT_WORKSPACE_ID } from "@echo/types";

const COUNT = Number(process.argv[2] ?? 10_000);
const FOLDERS = 12;

const WORDS = `merchant checkout webhook retry idempotent postgres index migration vector embedding
  search rank deploy rollback incident latency cache invalidation queue worker schema drizzle pglite
  tauri onboarding activation churn pricing invoice refund payout ledger reconciliation timezone`
  .split(/\s+/)
  .filter(Boolean);

/** Seeded, so two runs of this script measure the same corpus. */
const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const sentence = (rng: () => number, length: number): string =>
  Array.from({ length }, () => WORDS[Math.floor(rng() * WORDS.length)] as string).join(" ");

const time = async <T>(label: string, run: () => Promise<T> | T): Promise<T> => {
  const started = performance.now();
  const result = await run();
  const took = performance.now() - started;
  console.log(`${took.toFixed(0).padStart(7)}ms  ${label}`);
  return result;
};

const unit = (rng: () => number): Float32Array => {
  const values = new Float32Array(EMBEDDING_DIMENSIONS);
  let sum = 0;
  for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
    const value = rng() * 2 - 1;
    values[d] = value;
    sum += value * value;
  }
  const norm = Math.sqrt(sum) || 1;
  for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) values[d] = (values[d] as number) / norm;
  return values;
};

const main = async () => {
  const rng = mulberry(1312);
  console.log(`\ncorpus: ${COUNT} notes, ${FOLDERS} folders, ${EMBEDDING_DIMENSIONS} dimensions\n`);

  const { db, repositories, lexical } = await time("open + migrate", () => openRepositories());
  const echo = createEcho({ repositories });

  const folderIds = await time("seed folders", async () => {
    const ids: string[] = [];
    for (let f = 0; f < FOLDERS; f++) ids.push((await echo.folders.create({ name: `P${f}` })).id);
    return ids;
  });

  const noteIds: string[] = [];
  await time(`seed ${COUNT} notes`, async () => {
    const day = 86_400_000;
    const now = Date.now();
    for (let start = 0; start < COUNT; start += 500) {
      const rows: string[] = [];
      for (let n = start; n < Math.min(start + 500, COUNT); n++) {
        const id = randomUUID();
        noteIds.push(id);
        // A fifth stay in the Inbox: that pile is what the triage screen has to work through.
        const folderId = rng() < 0.2 ? null : (folderIds[Math.floor(rng() * FOLDERS)] as string);
        const content = sentence(rng, 40 + Math.floor(rng() * 60));
        const at = new Date(now - Math.floor(rng() * 365) * day).toISOString();
        const place = folderId === null ? "null" : `'${folderId}'`;
        rows.push(
          `('${id}','${DEFAULT_WORKSPACE_ID}',${place},'${content.slice(0, 60)}','${content}','${at}','${at}')`,
        );
      }
      await db.execute(
        `insert into notes (id, workspace_id, folder_id, title, content, created_at, updated_at) values ${rows.join(",")}` as never,
      );
    }
  });

  console.log("");

  // What the app does on open.
  const listed = await time("notes.list() — what the app opens with", () => echo.notes.list());
  console.log(`          → ${listed.length} of ${COUNT} notes returned`);
  const all = await time("notes.list({ limit: COUNT }) — the whole corpus", () =>
    echo.notes.list({ limit: COUNT }),
  );
  console.log(`          → ${all.length} notes`);
  await time("folders.list()", () => echo.folders.list());
  await time("categories.assignments()", () => echo.categories.assignments());
  await time("tasks.list()", () => echo.tasks.list());
  await time("learning.rules()", () => echo.learning.rules());
  await time("embeddings.pending() — the analyzer queue", () =>
    repositories.embeddings.pending("bench"),
  );

  console.log("");

  const index = createVectorIndex(EMBEDDING_DIMENSIONS);
  const vectors = noteIds.map((noteId) => ({ noteId, values: unit(rng) }));
  await time("vector index load", () => index.load(vectors));
  const query = unit(rng);
  await time("index.nearest(12) — one vote", () =>
    index.nearest(query, { limit: 12, minimumSimilarity: 0.4 }),
  );

  console.log("");

  await time("lexical.search('webhook retry')", () => lexical.search("webhook retry"));
  await time("lexical.search('web') — prefix, mid-keystroke", () => lexical.search("web"));

  console.log("");

  const unfiled = all.filter((note) => note.folderId === null);
  console.log(`inbox: ${unfiled.length} unfiled notes\n`);

  const vote = (note: (typeof all)[number], byId: Map<string, (typeof all)[number]>) => {
    const embedding = index.vectorOf(note.id);
    if (!embedding) return;
    const neighbours = index
      .nearest(embedding, { excludeNoteId: note.id, limit: 12, minimumSimilarity: 0.4 })
      .map((match) => ({
        noteId: match.noteId,
        folderId: byId.get(match.noteId)?.folderId ?? null,
        similarity: match.similarity,
      }));
    suggestDestinations(neighbours);
  };

  // Both shapes, because the difference is the point: `retrieval.destinations` used to build a map
  // of the whole corpus inside each call, which made triage quadratic in a corpus it only ever read
  // one way round. It takes a `folderOf` lookup now and the caller arranges it once.
  await time("inbox destinations — a map per note, as it was", () => {
    for (const note of unfiled) vote(note, new Map(all.map((other) => [other.id, other])));
  });
  await time("inbox destinations — one map, as it is", () => {
    const byId = new Map(all.map((other) => [other.id, other]));
    for (const note of unfiled) vote(note, byId);
  });

  console.log("");

  const vocabulary = createVocabulary({ vectorOf: (noteId) => index.vectorOf(noteId) });
  await time("vocabulary.learn over the corpus", () => {
    for (const note of all) vocabulary.learn(note.id, note.content);
  });
  const first = all[0];
  if (first) {
    await time("vocabulary.conceptsOf(one note)", () => vocabulary.conceptsOf(first.content, 6));
  }

  console.log("");
  process.exit(0);
};

void main();
