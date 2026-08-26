import { expect, test } from "bun:test";
import { type Place, parseQuery } from "./query";
import { buildAnchors } from "./temporal";

const NOW = new Date("2026-08-26T15:00:00");

const places: Place[] = [
  { kind: "folder", id: "f1", name: "Work" },
  { kind: "folder", id: "f2", name: "Work / Frontend" },
  { kind: "category", id: "c1", name: "auth" },
  { kind: "category", id: "c2", name: "Produção" },
];

const parse = (query: string, options = {}) => parseQuery(query, { now: NOW, places, ...options });

test("a question comes apart into a subject, a time and a place", () => {
  const parsed = parse("notes about middleware from last month in my Work projects");
  expect(parsed.terms).toBe("middleware");
  expect(parsed.period?.text).toBe("last month");
  expect(parsed.place?.name).toBe("Work");
});

test("the longest place named is the one meant", () => {
  expect(parse("caching in Work / Frontend").place?.name).toBe("Work / Frontend");
});

test("a place name is matched as a whole word", () => {
  // "auth" is a category here, and "author" is not it.
  const parsed = parse("notes about the author of the spec");
  expect(parsed.place).toBeNull();
  expect(parsed.terms).toBe("author of the spec");
});

test("an accented place name does not slide the rest of the question", () => {
  const parsed = parse("cache quebrado em Produção");
  expect(parsed.place?.name).toBe("Produção");
  expect(parsed.terms).toBe("cache quebrado");
});

test("framing is taken off and reported, not silently eaten", () => {
  const parsed = parse("aquela ideia que eu tive sobre fazer o mapa parecer infinito");
  expect(parsed.framing).toBe("aquela ideia que eu tive sobre");
  expect(parsed.terms).toBe("fazer o mapa parecer infinito");
});

test("a note remembered by how it felt is still a question about its subject", () => {
  const parsed = parse("uma nota onde eu tava puto com o cache do Next");
  expect(parsed.terms).toBe("cache do Next");
});

test("the English framings read the same way", () => {
  expect(parse("that idea I had about infinite maps").terms).toBe("infinite maps");
  expect(parse("something about a game merchant").terms).toBe("game merchant");
  expect(parse("when I was thinking about the inventory system").terms).toBe("inventory system");
});

test("a question anchored to a project is resolved against the corpus", () => {
  const anchors = buildAnchors([{ name: "HEREZE", at: new Date("2026-05-02T09:00:00") }]);
  const parsed = parse("extração desde que comecei HEREZE", { anchors });
  expect(parsed.period?.from).toEqual(new Date("2026-05-02T09:00:00"));
});

test("an anchor the corpus never heard of leaves the words in the question", () => {
  const parsed = parse("extração desde que comecei Vênus", { anchors: buildAnchors([]) });
  expect(parsed.period).toBeNull();
  // Dropping a filter echo could not place must not also delete what the reader typed.
  expect(parsed.terms).toContain("Vênus");
});

test("a plain question is left alone", () => {
  const parsed = parse("merchant inventory");
  expect(parsed).toEqual({
    terms: "merchant inventory",
    period: null,
    place: null,
    framing: null,
  });
});

test("the same question always comes apart the same way", () => {
  const query = "notes about auth from last month in my Work projects";
  expect(parse(query)).toEqual(parse(query));
});
