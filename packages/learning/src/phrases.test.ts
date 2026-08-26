import { describe, expect, test } from "bun:test";
import { createPhraseModel } from "./phrases";

/** Enough repetitions that a phrase is a habit rather than a coincidence. */
const taught = (...texts: string[]) => {
  const model = createPhraseModel();
  for (const text of texts) model.learn(text);
  return model;
};

describe("createPhraseModel", () => {
  test("finishes a word the reader keeps writing", () => {
    const model = taught("deploy the staging environment", "the staging environment is slow");
    expect(model.complete("check the stag")).toBe("ing environment");
  });

  test("carries on past the word when the phrase always continues the same way", () => {
    const model = taught(
      "preciso revisar o PR",
      "preciso revisar o PR",
      "preciso revisar o PR hoje",
    );
    expect(model.complete("preciso ")).toBe("revisar o PR");
  });

  test("says nothing about a phrase written once", () => {
    expect(taught("a completely unrepeated sentence").complete("a completely ")).toBe("");
  });

  test("says nothing when the reader's usage is split", () => {
    const model = taught(
      "deploy to staging",
      "deploy to staging",
      "deploy the invoice",
      "deploy the invoice",
      "deploy from laptop",
      "deploy from laptop",
    );
    expect(model.complete("deploy ")).toBe("");
  });

  test("a one or two letter prefix belongs to too much of the vocabulary", () => {
    const model = taught("something something", "something something");
    expect(model.complete("s")).toBe("");
  });

  test("does not finish the next thought after a line break", () => {
    const model = taught("preciso revisar o PR", "preciso revisar o PR");
    expect(model.complete("preciso revisar o PR\n")).toBe("");
  });

  test("unlearning a note takes its phrases back out", () => {
    const model = createPhraseModel();
    model.learn("preciso revisar o PR");
    model.learn("preciso revisar o PR");
    expect(model.complete("preciso ")).toBe("revisar o PR");

    model.unlearn("preciso revisar o PR");
    expect(model.complete("preciso ")).toBe("");
    expect(model.vocabulary).toBe(3);

    model.unlearn("preciso revisar o PR");
    expect(model.vocabulary).toBe(0);
  });

  test("offers what the reader wrote, in the case they wrote it in", () => {
    const model = taught("shipping to HEREZE today", "shipping to HEREZE tomorrow");
    expect(model.complete("shipping to HER")).toBe("EZE");
  });

  test("an empty model never speaks", () => {
    const model = createPhraseModel();
    expect(model.complete("")).toBe("");
    expect(model.complete("anything at all ")).toBe("");
  });
});
