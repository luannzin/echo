import { describe, expect, test } from "bun:test";
import { createPhraseModel } from "./phrases";
import { createVocabulary } from "./vocabulary";

/** A small corpus written the way one person writes: the same ideas, in their own words. */
const corpus: [string, string][] = [
  // One environment, three spellings — the reader uses one *instead of* the others.
  ["1", "deploy para prod quebrou o cache do Next"],
  ["2", "subi para production e o cache do Next voltou"],
  ["3", "produção caiu, deploy do cache do Next errado"],
  ["4", "prod estável hoje, deploy do cache comportado"],
  ["5", "production quebrou no deploy, cache do Next invalidado"],
  ["6", "produção estável, deploy do cache do Next comportado"],
  ["7", "prod caiu no deploy, cache do Next invalidado de novo"],
  ["8", "production estável, cache do Next voltou depois do deploy"],
  ["9", "produção quebrou, cache do Next errado outra vez"],
  // One game, two names.
  ["10", "HEREZE precisa de extração por drone e zumbis melhores"],
  ["11", "Deadlands precisa de extração mais rápida, zumbis burros"],
  ["12", "HEREZE: merchant vende munição, extração continua ruim"],
  ["13", "Deadlands merchant precisa de munição rara, zumbis atacando"],
  ["14", "HEREZE zumbis com áudio novo, extração mais tensa, merchant ok"],
  ["15", "Deadlands extração por helicóptero, zumbis em horda, merchant caro"],
];

const filled = () => {
  const vocabulary = createVocabulary();
  for (const [id, text] of corpus) vocabulary.learn(id, text);
  return vocabulary;
};

describe("createVocabulary", () => {
  test("reads what a note is about in the reader's own spelling", () => {
    const concepts = filled().conceptsOf("o merchant do HEREZE vende munição", 3);
    expect(concepts.map((term) => term.toLowerCase())).toContain("merchant");
    // The corpus has never seen this word, so it is a typo as often as it is an idea.
    expect(concepts.map((term) => term.toLowerCase())).not.toContain("vende");
  });

  test("a word the corpus has only seen once is not a concept", () => {
    expect(filled().conceptsOf("nadaqueexiste", 3)).toEqual([]);
  });

  test("related terms are the ones written in the same notes", () => {
    const related = filled()
      .relatedTo("cache", 4)
      .map((term) => term.toLowerCase());
    expect(related).toContain("next");
  });

  test("aliases are the words used in the same places", () => {
    const aliases = filled()
      .aliasesOf("prod", 3)
      .map((term) => term.toLowerCase());
    expect(aliases).toContain("production");
  });

  test("three spellings of one word are each other and nothing else", () => {
    const vocabulary = filled();
    // Not a subset check: the whole answer, because the failure worth catching here is the one
    // extra word that scores higher than the real ones and does not belong.
    expect(vocabulary.aliasesOf("prod", 4).map((t) => t.toLowerCase())).toEqual([
      "produção",
      "production",
    ]);
    expect(vocabulary.aliasesOf("production", 4).map((t) => t.toLowerCase())).toEqual([
      "prod",
      "produção",
    ]);
  });

  test("a word written beside all three spellings is not one of them", () => {
    // `estável` keeps better company with `prod` than `production` does, measured by similarity
    // alone. What rules it out is that it is written *with* them, never instead of them.
    const aliases = filled()
      .aliasesOf("estável", 4)
      .map((term) => term.toLowerCase());
    expect(aliases).not.toContain("prod");
    expect(aliases).not.toContain("production");
    expect(aliases).not.toContain("produção");
  });

  test("opposites read as substitutes, which is the known cost of this method", () => {
    // `estável` and `quebrou` fill the same slot and are never written together, which is the exact
    // shape of a synonym. Telling them apart needs something that knows what words mean. This is
    // pinned so the behaviour is a decision on the record rather than a surprise later.
    expect(
      filled()
        .aliasesOf("quebrou", 4)
        .map((t) => t.toLowerCase()),
    ).toContain("estável");
  });

  test("a word in nearly every note is nobody's other name", () => {
    const vocabulary = filled();
    expect(vocabulary.aliasesOf("cache")).toEqual([]);
    expect(vocabulary.aliasesOf("deploy")).toEqual([]);
  });

  test("a word echo has barely seen gets no synonyms at all", () => {
    const vocabulary = filled();
    vocabulary.learn("16", "wireguard tunelamento novo");
    vocabulary.learn("17", "wireguard tunelamento estável");
    // Two notes is not a profile, and echo says nothing rather than guessing from one.
    expect(vocabulary.aliasesOf("wireguard")).toEqual([]);
  });

  test("a project's two names find each other", () => {
    const aliases = filled()
      .aliasesOf("hereze", 3)
      .map((term) => term.toLowerCase());
    expect(aliases).toContain("deadlands");
  });

  test("words that merely turn up together are not each other", () => {
    const vocabulary = createVocabulary();
    // "Machine" and "learning" are inseparable and are never substitutes.
    for (let n = 0; n < 6; n++) {
      vocabulary.learn(`m${n}`, "machine learning pipeline treinado novamente");
    }
    expect(vocabulary.aliasesOf("machine", 3).map((t) => t.toLowerCase())).not.toContain(
      "learning",
    );
  });

  test("unlearning a note takes its words back out", () => {
    const vocabulary = filled();
    const before = vocabulary.terms;
    vocabulary.learn("9", "wireguard tunelamento wireguard");
    expect(vocabulary.terms).toBeGreaterThan(before);
    vocabulary.unlearn("9", "wireguard tunelamento wireguard");
    expect(vocabulary.terms).toBe(before);
    expect(vocabulary.notes).toBe(corpus.length);
  });

  test("an empty vocabulary says nothing", () => {
    const vocabulary = createVocabulary();
    expect(vocabulary.aliasesOf("prod")).toEqual([]);
    expect(vocabulary.relatedTo("prod")).toEqual([]);
    expect(vocabulary.conceptsOf("prod")).toEqual([]);
  });

  test("notes pointing elsewhere are refused however alike their company", () => {
    const apart = new Map<string, Float32Array>([
      ["1", new Float32Array([1, 0])],
      ["2", new Float32Array([0, 1])],
      ["3", new Float32Array([0, 1])],
      ["4", new Float32Array([1, 0])],
    ]);
    const vocabulary = createVocabulary({ vectorOf: (noteId) => apart.get(noteId) });
    for (const [id, text] of corpus.slice(0, 4)) vocabulary.learn(id, text);
    expect(vocabulary.aliasesOf("prod", 3).map((t) => t.toLowerCase())).not.toContain("production");
  });
});

describe("phrasesFor", () => {
  test("offers the reader's own phrases around a word", () => {
    const phrases = createPhraseModel();
    for (const text of [
      "production cache is stale again",
      "the production cache never invalidates",
      "RSC cache is a different cache",
      "RSC cache confuses everyone",
    ]) {
      phrases.learn(text);
    }

    const found = phrases.phrasesFor("cache", 4);
    expect(found).toContain("production cache");
    expect(found).toContain("RSC cache");
  });

  test("a phrase written once is not a phrase", () => {
    const phrases = createPhraseModel();
    phrases.learn("production cache is stale");
    expect(phrases.phrasesFor("cache")).toEqual([]);
  });
});
