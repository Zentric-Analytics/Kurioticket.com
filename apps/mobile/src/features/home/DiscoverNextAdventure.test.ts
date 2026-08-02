import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("the shared homepage renders one discovery board immediately after popular stays", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  const placement = /<PopularDestinationStays\s*\/>\s*<DiscoverNextAdventure\s*\/>/g;

  assert.equal([...home.matchAll(placement)].length, 1);
  assert.equal((home.match(/<DiscoverNextAdventure\s*\/>/g) ?? []).length, 1);
});

test("the discovery board matches the website mobile board and opens real flight routes", () => {
  const discovery = source("src/features/home/DiscoverNextAdventure.tsx");

  assert.match(discovery, /Discover your next adventure here/);
  assert.match(discovery, /Compare smart route ideas, flexible fares, and destinations picked for your region\./);
  assert.equal((discovery.match(/id: "ng-/g) ?? []).length, 8);
  assert.match(discovery, /index % 2 === 0/);
  assert.match(discovery, /index % 2 === 1/);
  assert.match(discovery, /pathname: "\/flights"/);
  assert.match(discovery, /imageFailed \?/);
});
