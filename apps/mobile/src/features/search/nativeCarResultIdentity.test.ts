import assert from "node:assert/strict";
import test from "node:test";
import { nativeCarResultIdentity } from "./nativeCarResultIdentity";

test("splits the supported Mercedes-Benz models for native presentation", () => {
  for (const model of ["E-Class", "V-Class", "C-Class"]) {
    assert.deepEqual(nativeCarResultIdentity(`Mercedes-Benz ${model}`), {
      primaryName: "Mercedes-Benz",
      secondaryModel: model,
    });
  }
});

test("does not guess manufacturer boundaries for other makes", () => {
  for (const modelName of ["Toyota Corolla", "BMW 3 Series", "Volkswagen Golf"]) {
    assert.deepEqual(nativeCarResultIdentity(modelName), {
      primaryName: modelName,
      secondaryModel: null,
    });
  }
});

test("normalizes presentation whitespace and safely handles a missing Mercedes-Benz model", () => {
  assert.deepEqual(nativeCarResultIdentity("  Mercedes-Benz   E-Class  "), {
    primaryName: "Mercedes-Benz",
    secondaryModel: "E-Class",
  });
  assert.deepEqual(nativeCarResultIdentity(" Mercedes-Benz "), {
    primaryName: "Mercedes-Benz",
    secondaryModel: null,
  });
});
