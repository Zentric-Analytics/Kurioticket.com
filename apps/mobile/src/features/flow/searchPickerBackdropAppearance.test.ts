import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flowSource = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const pickerFiles = [
  "FlightSearchPanel.tsx", "HotelSearchPanel.tsx", "CarSearchPanel.tsx",
  "CarSearchPickers.tsx", "PackageSearchForm.tsx", "DateRangeSheet.tsx",
  "LocalCalendarModal.tsx",
] as const;
const presentationSource = flowSource("searchPickerPresentation.ts");

test("native search pickers share the approved subtle backdrop", () => {
  assert.match(presentationSource, /SEARCH_PICKER_BACKDROP_COLOR = "rgba\(8, 18, 35, 0\.24\)"/);
  for (const file of pickerFiles) {
    const source = flowSource(file);
    assert.match(source, /import \{ SEARCH_PICKER_BACKDROP_COLOR \} from "\.\/searchPickerPresentation";/, `${file} imports the shared backdrop`);
    assert.match(source, /backgroundColor:SEARCH_PICKER_BACKDROP_COLOR/, `${file} applies the shared backdrop`);
    assert.doesNotMatch(source, /rgba\(8, 18, 35, 0\.24\)/, `${file} does not duplicate the backdrop value`);
  }
});

test("Flight Edit Search keeps its stronger reference backdrop", () => {
  const source = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  assert.match(source, /backgroundColor: "rgba\(8, 18, 35, 0\.52\)"/);
  assert.doesNotMatch(source, /SEARCH_PICKER_BACKDROP_COLOR/);
});

test("picker backdrop interaction and Android Back contracts remain in place", () => {
  for (const file of pickerFiles) {
    const source = flowSource(file);
    assert.match(source, /style=\{StyleSheet\.absoluteFill\}/, `${file} keeps a full-screen backdrop sibling`);
    assert.match(source, /<Modal[^>]*onRequestClose=\{(?:onClose|onCancel)\}/, `${file} preserves Android Back handling`);
  }

  const calendar = flowSource("LocalCalendarModal.tsx");
  assert.match(calendar, /dismissOnBackdropPress \? <Pressable[^>]*onPress=\{onClose\}/);
  assert.match(calendar, /: <View pointerEvents="none" style=\{StyleSheet\.absoluteFill\}\/?>/);
});
