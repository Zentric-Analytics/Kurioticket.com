import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("approved Explore editorial content retains exact order", () => {
  const source = readFileSync("src/features/explore/exploreData.ts", "utf8");
  assert.match(source, /POPULAR_DESTINATIONS[\s\S]*Paris[\s\S]*Tokyo[\s\S]*Santorini[\s\S]*Dubai/);
  assert.match(source, /TRENDING[\s\S]*New York[\s\S]*London[\s\S]*Dubai[\s\S]*Rome[\s\S]*Barcelona[\s\S]*Bangkok/);
  assert.match(source, /INTERESTS[\s\S]*Beaches[\s\S]*Cities[\s\S]*Adventure[\s\S]*Nature[\s\S]*Culture[\s\S]*Family/);
  assert.equal((source.match(/id: "/g) || []).length, 4);
});
