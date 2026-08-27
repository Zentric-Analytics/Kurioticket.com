import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
test("Results delegates mobile Edit Search to the shared drawer", () => {
  assert.match(source, /import \{ FlightEditSearchDrawer/);
  assert.match(source, /<FlightEditSearchDrawer/);
  assert.match(source, /open=\{mobileSearchOpen\}/);
  assert.match(source, /router\.push\(`\/flights\/results\?/);
});
