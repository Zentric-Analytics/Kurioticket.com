import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/storage/savedFlightsLegacyStorage.ts", "utf8");
test("legacy saved-flight storage retains migration-compatible key, JSON read, and JSON write", () => {
  assert.match(source, /kurioticket\.saved\.flights\.v1/);
  assert.match(source, /encodeURIComponent\(userId\)/);
  assert.match(source, /JSON\.parse\(raw\)/);
  assert.match(source, /JSON\.stringify\(flights\)/);
  assert.match(source, /SecureStore\.getItemAsync\(key\)/);
  assert.match(source, /SecureStore\.setItemAsync\(key, value\)/);
});
