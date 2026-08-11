import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/legal/LegalViewer.tsx", "utf8");

test("production legal viewer does not render internal developer placeholder notices", () => {
  assert.doesNotMatch(source, /developerNote|legalDeveloperNote|startup placeholder/i);
  assert.match(source, /localizedDocument\.sections\.map/);
});
