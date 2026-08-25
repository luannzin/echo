import { expect, test } from "bun:test";
import { normalize, similarity } from "./index";

test("normalize returns a unit vector and leaves zero alone", () => {
  const unit = normalize(Float32Array.from([3, 4]));
  expect(similarity(unit, unit)).toBeCloseTo(1, 6);
  expect([...normalize(Float32Array.from([0, 0]))]).toEqual([0, 0]);
});

test("similarity is 1 for the same direction, 0 for perpendicular, negative for opposite", () => {
  const east = Float32Array.from([1, 0]);
  expect(similarity(east, east)).toBeCloseTo(1, 6);
  expect(similarity(east, Float32Array.from([0, 1]))).toBeCloseTo(0, 6);
  expect(similarity(east, Float32Array.from([-1, 0]))).toBeCloseTo(-1, 6);
});

test("vectors of different widths cannot be compared", () => {
  expect(() => similarity(Float32Array.from([1]), Float32Array.from([1, 0]))).toThrow(
    /different widths/,
  );
});
