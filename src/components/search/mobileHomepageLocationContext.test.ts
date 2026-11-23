import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");

test("mobile homepage flight fields retain selected airport context", () => {
  assert.match(source, /const display = getLocationFieldDisplay\(value\)/);
  assert.match(source, /display\.primary \|\| placeholder/);
  assert.match(source, /display\.secondary/);
});
