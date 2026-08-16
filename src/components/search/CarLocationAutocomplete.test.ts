import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarLocationAutocomplete.tsx", import.meta.url), "utf8");
const contract = readFileSync(new URL("./useCarsDesktopPopover.ts", import.meta.url), "utf8");

test("desktop Cars locations use the shared moderate popover contract", () => {
  assert.match(source, /useCarsDesktopPopover/);
  assert.match(source, /preferredWidth: 420/);
  assert.match(source, /maxHeight: 320/);
  assert.match(contract, /rounded-\[10px\]/);
  assert.match(contract, /border-\[#DEE5ED\]/);
  assert.match(contract, /z-\[1100\]/);
});

test("desktop location suggestion icons remain neutral", () => {
  assert.match(source, /bg-slate-100 text-slate-600/);
  assert.doesNotMatch(source, /bg-slate-100 text-\[#004BB8\]/);
});

test("location combobox retains keyboard selection semantics", () => {
  for (const key of ["ArrowDown", "ArrowUp", "Enter", "Escape", "Home", "End"])
    assert.ok(source.includes(`event.key === "${key}"`));
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-activedescendant=\{activeId\}/);
});
