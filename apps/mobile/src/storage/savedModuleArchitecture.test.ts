import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = (name: string) => readFileSync(`src/storage/${name}`, "utf8");
test("Saved modules have an acyclic runtime dependency graph", () => {
  assert.doesNotMatch(source("savedRepository.ts"), /from ["']\.\/useSavedFlights["']/);
  assert.doesNotMatch(source("useSavedFlights.ts"), /from ["']\.\/useSavedDestinations["']/);
  assert.match(source("useSavedFlights.ts"), /from ["']\.\/savedRepository["']/);
  assert.match(source("savedRepository.ts"), /from ["']\.\/savedFlightsLegacyStorage["']/);
  for (const forbidden of ["savedRepository", "useSavedFlights", "useSavedDestinations"]) {
    assert.doesNotMatch(source("savedFlightsLegacyStorage.ts"), new RegExp(`from ["'][^"']*${forbidden}`));
    assert.doesNotMatch(source("favoriteSignInPrompt.ts"), new RegExp(`from ["'][^"']*${forbidden}`));
  }
});
