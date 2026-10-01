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

test("Cars Results desktop suggestions use a compact neutral car icon treatment", () => {
  assert.match(source, /import \{[^}]*CarFront[^}]*\} from "lucide-react"/);
  assert.match(source, /data-cars-results-location-icon/);
  assert.match(
    source,
    /h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500/,
  );
  assert.match(source, /<CarFront className="h-4 w-4" \/>/);
});

test("Cars Results desktop suggestions mirror the compact Hotels hierarchy without a visible scrollbar thumb", () => {
  assert.match(
    source,
    /desktopResultsPresentation[\s\S]*?p-1\.5 \[scrollbar-width:none\] \[&::?-webkit-scrollbar\]:hidden/,
  );
  assert.match(source, /data-cars-results-location-option/);
  assert.match(
    source,
    /rounded-xl px-3 py-2\.5 text-start transition-colors/,
  );
  assert.match(source, /text-sm font-semibold text-slate-950/);
  assert.match(source, /text-xs font-medium text-slate-600/);
  assert.match(
    source,
    /rounded-full bg-slate-100 px-2 py-1 text-\[11px\] font-bold text-slate-600/,
  );
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

test("Cars Results desktop location focus stays clean while empty and opens once a query exists", () => {
  assert.match(
    source,
    /usesDesktopPanel && desktopResultsPresentation[\s\S]*?open && trimmedQuery\.length >= 1/,
  );
  assert.match(source, /onFocus=\{\(\) => setOpen\(true\)\}/);
  assert.match(source, /onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(
    source,
    /usesDesktopPanel &&[\s\S]*?desktopResultsPresentation &&[\s\S]*?trimmedQuery\.length < 1[\s\S]*?setSuggestions\(\[\]\)[\s\S]*?return;/,
  );
  assert.match(
    source,
    /limit:[\s\S]*?usesDesktopPanel && desktopResultsPresentation \? "6" : "8"/,
  );
});

test("Cars Results desktop location dropdown keeps existing-value and edited-query behavior", () => {
  assert.match(
    source,
    /const onChange = \(event: ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?onValueChange\(event\.target\.value\);[\s\S]*?setOpen\(true\);/,
  );
  assert.match(source, /aria-expanded=\{showPanel\}/);
  assert.match(source, /const label = usesDesktopPanel\s*\? strings\.locationSuggestions/);
  assert.doesNotMatch(source, /hasUserEditedQuery/);
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
