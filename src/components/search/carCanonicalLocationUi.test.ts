import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

test("mobile and desktop car pickers render canonical primary and supporting labels", () => {
  const mobile = read("./MobileCarLocationPicker.tsx");
  const desktop = read("./CarLocationAutocomplete.tsx");
  assert.match(mobile, /item\.canonical\.primaryLabel/);
  assert.match(mobile, /item\.canonical\.supportingLabel/);
  assert.match(desktop, /suggestion\.canonical\?\.primaryLabel/);
  assert.match(desktop, /suggestion\.canonical\?\.supportingLabel/);
});

test("selection still auto-commits the unchanged submitted value", () => {
  const mobile = read("./MobileCarLocationPicker.tsx");
  const desktop = read("./CarLocationAutocomplete.tsx");
  assert.match(mobile, /onCommit\(item\.value\);[\s\S]*?requestClose\(\)/);
  assert.match(desktop, /onValueChange\(suggestion\.value\);[\s\S]*?close\(\)/);
});
