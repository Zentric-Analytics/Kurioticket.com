import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const resultsSource = () => read("src/features/search/ApprovedResultsScreen.tsx");
const modalSource = () => read("src/features/search/HotelEditSearchModal.tsx");
const panelSource = () => read("src/features/flow/HotelSearchPanel.tsx");

test("Hotel Results Edit opens an in-place Hotel editor with current committed params", () => {
  const source = resultsSource();
  const start = source.indexOf("  const edit = () => {");
  const end = source.indexOf("  const normalizeFlightPrice", start);
  const edit = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(source, /const \[hotelEditSearchOpen, setHotelEditSearchOpen\] = useState\(false\)/);
  assert.match(source, /const \[hotelEditPresentation, setHotelEditPresentation\] = useState\(0\)/);
  assert.match(edit, /if \(product === "flight"\)[\s\S]*setEditSearchOpen\(true\)[\s\S]*return;[\s\S]*setHotelEditPresentation\(\(presentation\) => presentation \+ 1\);[\s\S]*setHotelEditSearchOpen\(true\)/);
  assert.doesNotMatch(edit, /router\.(?:push|replace)|pathname: "\/hotels"/);
  assert.match(source, /<HotelEditSearchModal[\s\S]*key=\{hotelEditPresentation\}[\s\S]*visible=\{hotelEditSearchOpen\}[\s\S]*params=\{params\}[\s\S]*onClose=\{\(\) => setHotelEditSearchOpen\(false\)\}/);
  assert.doesNotMatch(source, /topInset=\{topSafeAreaInset\}/);
});

test("Hotel edit modal uses the Flight floating-sheet presentation", () => {
  const modal = modalSource();
  assert.match(modal, /useSearchPickerMotion\(visible, \{ additionalTravelDistance: floatingBottomGap \}\)/);
  assert.match(modal, /FLIGHT_FLOATING_SHEET_BOTTOM_GAP, FLIGHT_QUICK_SHEET_HORIZONTAL_INSET, FLIGHT_RESULTS_LIGHT_CANVAS/);
  assert.match(modal, /internalBottomPadding = Math\.max\(20, bottomSafeAreaInset - floatingBottomGap\)/);
  assert.match(modal, /sheet: \{ maxHeight: "88%", marginHorizontal: FLIGHT_QUICK_SHEET_HORIZONTAL_INSET/);
  assert.match(modal, /borderBottomLeftRadius: 24, borderBottomRightRadius: 24/);
  assert.match(modal, /marginBottom: floatingBottomGap/);
  assert.match(modal, /backgroundColor: "rgba\(8, 18, 35, 0\.52\)"/);
  assert.match(modal, /resultsCanvas = ft\.theme\.dark \? ft\.colors\.page : FLIGHT_RESULTS_LIGHT_CANVAS/);
  assert.doesNotMatch(modal, /animationType="slide"|borderBottomWidth: 0|rgba\(15, 23, 42, 0\.35\)|BlurView/);
  assert.match(modal, />Edit hotel search<\/Text>/);
  assert.doesNotMatch(modal, />Change your search<\/Text>/);
});

test("Hotel edit modal has no obsolete top-drawer safe-area contract", () => {
  const modal = modalSource();
  assert.doesNotMatch(modal, /topInset: number|safeAreaClearance|height: topInset/);
  assert.doesNotMatch(resultsSource(), /topInset=\{topSafeAreaInset\}/);
});

test("Hotel edit modal embeds the shared form and replaces only after closing", () => {
  const modal = modalSource();
  assert.match(modal, /<Modal transparent animationType="none" visible onRequestClose=\{onClose\} statusBarTranslucent>/);
  assert.match(modal, /accessibilityViewIsModal/);
  assert.match(modal, /accessibilityLabel="Close hotel edit search"/);
  assert.match(modal, /keyboardShouldPersistTaps="handled"/);
  assert.match(modal, /<HotelSearchPanel embedded params=\{presentedParams\} submitNavigation="replace" onBeforeNavigate=\{onClose\} editAppearance submitLabel="Search" \/>/);
  assert.doesNotMatch(modal, /router\.|hotelSearchParams|travelApi/);
  assert.match(modal, /useRetainedPickerContext\(visible, params\)/);
});

test("Hotel form preserves push by default and closes before configured navigation", () => {
  const panel = panelSource();
  assert.match(panel, /submitNavigation = "push", onBeforeNavigate, editAppearance = false/);
  assert.match(panel, /onBeforeNavigate\?\.\(\);\s*router\[submitNavigation\]\(\{ pathname: "\/hotel-results", params: hotelSearchParams\(form\) \}\)/);
  const validation = panel.indexOf("const nextErrors = validateHotelForm(form)");
  const close = panel.indexOf("onBeforeNavigate?.()", validation);
  const navigate = panel.indexOf("router[submitNavigation]", close);
  assert.ok(validation >= 0 && close > validation && navigate > close);
});

test("Hotel editor keeps canonical fields and cancellation cannot mutate Results params", () => {
  const modal = modalSource();
  const panel = panelSource();
  const model = read("src/features/flow/hotelSearchModel.ts");
  for (const key of ["destination", "checkIn", "checkOut", "guests", "rooms"] as const) {
    assert.match(model, new RegExp(`${key}:`));
  }
  assert.doesNotMatch(modal, /setParams|router\./);
  assert.match(modal, /onRequestClose=\{onClose\}/);
  assert.match(modal, /onPress=\{onClose\}/);
  assert.match(panel, /validateHotelForm\(form\)/);
  assert.match(panel, /hotelSearchParams\(form\)/);
});

test("Hotel edit modal matches Flight header and content geometry", () => {
  const modal = modalSource();
  assert.match(modal, /import \{ SafeAreaView, useSafeAreaInsets \} from "react-native-safe-area-context"/);
  assert.match(modal, /<SafeAreaView edges=\{\["top", "left", "right"\]\} style=\{styles\.backdrop\}>/);
  assert.doesNotMatch(modal, /edges=\{\[[^\]]*"bottom"/);
  assert.match(modal, /content: \{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 \}/);
  assert.match(modal, /header: \{ minHeight: 52,[^\n]*paddingLeft: 16, paddingRight: 8 \}/);
  assert.match(modal, /title: \{[^\n]*fontSize: 19, lineHeight: 24, fontWeight: "600" \}/);
  assert.match(modal, /close: \{ width: 44, height: 44/);
  assert.match(modal, /<X accessible=\{false\} size=\{23\}/);
});
