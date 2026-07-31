import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("approved Explore editorial content retains exact order", () => {
  const source = readFileSync("src/features/explore/exploreData.ts", "utf8");
  assert.match(source, /POPULAR_DESTINATIONS[\s\S]*Paris[\s\S]*Bali[\s\S]*Santorini[\s\S]*New York/);
  assert.match(source, /TRENDING[\s\S]*New York[\s\S]*London[\s\S]*Dubai[\s\S]*Rome[\s\S]*Barcelona[\s\S]*Bangkok/);
  assert.match(source, /INTERESTS[\s\S]*Beaches[\s\S]*Cities[\s\S]*Adventure[\s\S]*Nature[\s\S]*Culture[\s\S]*Family/);
  assert.equal((source.match(/id: "/g) || []).length, 4);
});

test("popular destinations include regions and use matching repository images", () => {
  const source = readFileSync("src/features/explore/exploreData.ts", "utf8");
  const popular = source.slice(source.indexOf("POPULAR_DESTINATIONS"), source.indexOf("export const TRENDING"));

  for (const [name, region, asset] of [
    ["Paris", "France", "destinations/paris.jpg"],
    ["Bali", "Indonesia", "destinations/bali.jpg"],
    ["Santorini", "Greece", "heroes/home-santorini.png"],
    ["New York", "United States", "destinations/new-york.jpg"],
  ]) {
    assert.match(popular, new RegExp(`name: "${name}", region: "${region}"[\\s\\S]*?${asset.replace(".", "\\.")}`));
  }
  assert.doesNotMatch(popular, /name: "(?:Tokyo|Dubai)"/);
});
