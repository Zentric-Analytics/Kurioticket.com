import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pickerFiles = [
  "FlightSearchPanel.tsx", "HotelSearchPanel.tsx", "CarSearchPanel.tsx",
  "CarSearchPickers.tsx", "PackageSearchForm.tsx", "DateRangeSheet.tsx",
  "LocalCalendarModal.tsx",
] as const;
const sources = pickerFiles.map((file) => ({ file, source: readFileSync(`src/features/flow/${file}`, "utf8") }));

test("native search picker backdrops remain full-screen and visually transparent", () => {
  for (const { file, source } of sources) {
    assert.match(source, /style=\{StyleSheet\.absoluteFill\}/, `${file} keeps a full-screen backdrop`);
    assert.doesNotMatch(source, /ft\.colors\.overlay|#071A4866|#020617AA/, `${file} adds no picker backdrop tint`);
  }
});

test("transparent search picker backdrops remain dismissal controls beside their sheets", () => {
  const backdrop = /<Pressable style=\{StyleSheet\.absoluteFill\}[^>]*onPress=\{(?:onClose|onCancel)\}[^>]*\/>/g;
  for (const { file, source } of sources) {
    const matches = [...source.matchAll(backdrop)];
    assert.ok(matches.length > 0, `${file} keeps a Pressable cancellation backdrop`);
    for (const match of matches) {
      const sheet = source.indexOf("<View accessibilityViewIsModal", match.index! + match[0].length);
      assert.ok(sheet >= match.index! + match[0].length, `${file} renders its sheet after the sibling backdrop`);
    }
    assert.match(source, /<Modal[^>]*onRequestClose=\{(?:onClose|onCancel)\}/, `${file} preserves Android Back dismissal`);
  }
});
