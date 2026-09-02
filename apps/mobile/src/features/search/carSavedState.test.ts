import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("car save state delegates to the account-backed canonical repository", () => {
  const source = readFileSync("src/features/search/carSavedState.ts", "utf8");
  assert.match(source, /useCanonicalSaved/);
  assert.match(source, /savedState\.cars\.has\(result\.id\)/);
  assert.match(source, /savedState\.toggleCar\(result, searchParams\)/);
  assert.doesNotMatch(source, /new Set/);
});
