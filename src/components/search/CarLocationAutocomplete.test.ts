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

test("desktop results omit the visible heading but retain listbox labeling", () => {
  assert.match(source, /!usesDesktopPanel \? <div[^>]*>\{label\}<\/div> : null/);
  assert.match(source, /role="listbox"[^>]*aria-label=\{label\}/);
});

test("location combobox retains keyboard selection semantics", () => {
  for (const key of ["ArrowDown", "ArrowUp", "Enter", "Escape", "Home", "End"])
    assert.ok(source.includes(`event.key === "${key}"`));
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-activedescendant=\{activeId\}/);
});

test("desktop Cars location dropdown opens immediately on focus or click like Hotels", () => {
  assert.match(source, /const showPanel = open;/);
  assert.match(source, /onFocus=\{\(\) => setOpen\(true\)\}/);
  assert.match(source, /onClick=\{\(\) => setOpen\(true\)\}/);
  assert.doesNotMatch(source, /hasUserEditedQuery/);
  assert.match(source, /new URLSearchParams\(\{ q: trimmedQuery, limit: "8" \}\)/);
});

test("desktop Cars location dropdown keeps working for existing, edited, and empty values", () => {
  assert.doesNotMatch(
    source,
    /usesDesktopPanel && \(!hasUserEditedQuery \|\| !trimmedQuery\)/,
  );
  assert.match(
    source,
    /const onChange = \(event: ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?onValueChange\(event\.target\.value\);[\s\S]*?setOpen\(true\);/,
  );
  assert.doesNotMatch(source, /setOpen\(false\)[\s\S]*?if \(!nextQuery\)/);
  assert.match(source, /aria-expanded=\{showPanel\}/);
  assert.match(source, /const label = usesDesktopPanel\s*\? strings\.locationSuggestions/);
});

test("desktop pickup and return use one input-anchored request and selection lifecycle", () => {
  assert.match(source, /launcherRef: activeInputRef/);
  assert.doesNotMatch(source, /fieldAnchorRef|searchCardRef/);
  assert.equal(
    (source.match(/fetch\(`\/api\/cars\/locations\?\$\{params\.toString\(\)\}`/g) ?? []).length,
    1,
    "one autocomplete instance issues one logical request for a debounced query",
  );
  assert.match(
    source,
    /const selectSuggestion = \(suggestion: CarLocationSuggestion\) => \{[\s\S]*?onValueChange\(suggestion\.value\);[\s\S]*?onSelect\?\.\(suggestion\);[\s\S]*?close\(\);/,
  );
  assert.match(source, /onClick=\{\(\) => selectSuggestion\(suggestion\)\}/);
});
