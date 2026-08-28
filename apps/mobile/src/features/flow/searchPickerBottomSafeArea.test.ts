import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flowFiles = [
  "FlightSearchPanel.tsx",
  "HotelSearchPanel.tsx",
  "CarSearchPanel.tsx",
  "CarSearchPickers.tsx",
  "PackageSearchForm.tsx",
  "LocalCalendarModal.tsx",
  "DateRangeSheet.tsx",
];

const sources = flowFiles.map((file) => ({
  file,
  source: readFileSync(`src/features/flow/${file}`, "utf8"),
}));
const editSearchSource = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");

test("every moving native search sheet owns its bottom safe area", () => {
  for (const { file, source } of sources) {
    const sheets = source.match(/onLayout=\{(?:motion|keyboardPresentation)\.onSheetLayout\}/g) ?? [];
    const internalInsets =
      source.match(
        /paddingBottom:\s*\d*\s*\+?\s*motion\.bottomSafeAreaInset/g,
      ) ?? [];
    assert.equal(
      internalInsets.length,
      sheets.length,
      `${file}: every measured moving sheet must include the bottom inset`,
    );
    assert.doesNotMatch(
      source,
      /SafeAreaView[^>]*edges=\{\[[^\]]*"bottom"/s,
      `${file}: bottom safe area must not position outside a sheet`,
    );
  }
});

test("top safe-area positioning remains on full-height search overlays", () => {
  for (const file of [
    "FlightSearchPanel.tsx",
    "HotelSearchPanel.tsx",
    "CarSearchPanel.tsx",
  ]) {
    const source = sources.find((entry) => entry.file === file)!.source;
    assert.match(source, /SafeAreaView[^>]*edges=\{\["top"\]\}/s, file);
  }
  assert.match(editSearchSource, /SafeAreaView[^>]*edges=\{\["top"\]\}/s, "FlightEditSearchModal.tsx");
  assert.match(editSearchSource, /paddingBottom: bottomSafeAreaInset/);
});

test("local calendar preserves lateral safe areas while its moving surface owns the bottom inset", () => {
  const source = sources.find(
    (entry) => entry.file === "LocalCalendarModal.tsx",
  )!.source;
  assert.match(
    source,
    /SafeAreaView[^>]*edges=\{\["top", "left", "right"\]\}/s,
  );
  assert.doesNotMatch(
    source,
    /SafeAreaView[^>]*edges=\{\[[^\]]*"bottom"/s,
  );
  assert.match(
    source,
    /Animated\.View accessibilityViewIsModal onLayout=\{motion\.onSheetLayout\} style=\{\[styles\.modal, \{ backgroundColor: ft\.colors\.surface, paddingBottom: 16 \+ motion\.bottomSafeAreaInset \}, motion\.sheetStyle\]\}/,
  );
});

test("the safe-area inset is painted by the themed moving surface", () => {
  for (const { file, source } of sources) {
    const surfaceInsets =
      source.match(
        /backgroundColor:\s*ft\.colors\.surface[\s\S]{0,100}paddingBottom:[\s\S]{0,50}motion\.bottomSafeAreaInset/g,
      ) ?? [];
    const sheets = source.match(/onLayout=\{(?:motion|keyboardPresentation)\.onSheetLayout\}/g) ?? [];
    assert.equal(
      surfaceInsets.length,
      sheets.length,
      `${file}: the surface color and inset must share sheet geometry`,
    );
  }
});
