import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
import { destinations, deriveDestinations } from "./destinationCatalogue";

const readRepositoryFile = (path: string) => readFileSync(`../../${path}`, "utf8");

test("shared airport records are a runtime-neutral import-free literal module", () => {
  const shared = readRepositoryFile("shared/travel/airports.ts");
  assert.doesNotMatch(shared, /^\s*import\s/m);
  for (const forbidden of [/Intl\.DisplayNames/i, /process\.env/i, /require\(["']fs["']\)/i, /node:/i, /next\//i, /\breact(?: native)?\b/i, /\bexpo(?!rt)\b/i]) {
    assert.doesNotMatch(shared, forbidden);
  }
  assert.equal((shared.match(/^  \{"code":/gm) ?? []).length, 248);
});

test("mobile adapter reaches only the shared plain-data module", () => {
  const adapter = readFileSync("src/features/flow/airportData.ts", "utf8");
  const imports = [...adapter.matchAll(/^import .* from ["']([^"']+)["'];?$/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["../../../../../shared/travel/airports"]);
  assert.doesNotMatch(adapter, /src\/data\/airports|src\/lib\//);
  assert.equal((adapter.match(/\bcode:\s*["'][A-Z]{3}["']/g) ?? []).length, 0);
});

test("web and mobile consume one canonical record source", () => {
  const web = readRepositoryFile("src/data/airports.ts");
  assert.match(web, /SHARED_AIRPORTS/);
  assert.doesNotMatch(web, /const airportSeeds/);
});

test("catalogue initializes synchronously without platform services", () => {
  assert.equal(airports.length, 248);
  assert.equal(destinations.length, 234);
  assert.doesNotThrow(() => deriveDestinations(airports));
  assert.deepEqual(deriveDestinations([...airports].reverse()), destinations);
});
