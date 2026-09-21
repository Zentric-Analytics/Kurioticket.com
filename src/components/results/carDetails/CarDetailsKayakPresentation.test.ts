import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const hero = readFileSync("src/components/results/carDetails/CarDetailsHero.tsx", "utf8");
const details = readFileSync("src/components/results/CarDetailsClient.tsx", "utf8");

test("KAYAK details use provider specifications instead of normalized placeholders", () => {
  assert.match(hero, /car\.sandboxPresentation\s*\? car\.sandboxPresentation\.specs\.map/);
  assert.match(details, /car\.sandboxPresentation \? \[/);
  assert.match(details, /Simulated inventory — no real booking/);
});

test("KAYAK pickup presentation does not claim the normalized fallback pickup type", () => {
  assert.equal((details.match(/car\.sandboxPresentation\?\.pickupLabel \?\? pickupTypeLabels\[car\.pickupType\]/g) ?? []).length, 2);
});
