import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotel = readFileSync(new URL("./HotelSearchPanel.tsx", import.meta.url).pathname, "utf8");
const primitives = readFileSync(new URL("./FlowPrimitives.tsx", import.meta.url).pathname, "utf8");
const packages = readFileSync(new URL("./PackageSearchForm.tsx", import.meta.url).pathname, "utf8");
const closedFields = hotel.slice(hotel.indexOf("return <View"), hotel.indexOf("<DateRangeSheet"));

test("Hotel closed rows reuse the Packages CompactSearchField architecture", () => {
  assert.match(hotel, /import \{ CompactSearchField, PickerSheetHeader, PrimaryButton, UnavailableNotice \} from "\.\/FlowPrimitives"/);
  assert.match(packages, /import \{ CompactSearchField, PickerSheetHeader, PrimaryButton \} from "\.\/FlowPrimitives"/);
  assert.equal(closedFields.match(/<CompactSearchField/g)?.length, 3);
  assert.doesNotMatch(closedFields, /<Field\b|locationFieldRow|locationFieldContent/);
  assert.equal(closedFields.match(/trailing=\{false\}/g)?.length, 1);
  assert.doesNotMatch(hotel, /function (?:HotelCompactField|HotelSearchRow|PackageStyleHotelField)/);
});

test("Destination uses the Hotel wording and shared location row", () => {
  assert.match(closedFields, /<CompactSearchField label="Destination"[^>]*value=\{form\.destination \|\| "City or hotel"\}[^>]*trailing=\{false\}[^>]*appearance=\{editAppearance \? "resultsEdit" : "default"\}/);
  assert.doesNotMatch(closedFields, /City, area, or hotel/);
});

test("Travel dates truncate only for edit appearance and otherwise wrap without limit", () => {
  assert.match(closedFields, /<CompactSearchField label="Travel dates"[^\n]*valueNumberOfLines=\{editAppearance \? 1 : 0\}/);
  assert.doesNotMatch(closedFields, /label="Destination"[^>]*valueNumberOfLines/);
  assert.doesNotMatch(closedFields, /label="Guests"[^>]*valueNumberOfLines/);
});

test("Guests keeps the existing Hotel count summary in the shared person row", () => {
  assert.match(closedFields, /<CompactSearchField label="Guests" value=\{`\$\{countLabel\(form\.guests, "guest"\)\}, \$\{countLabel\(form\.rooms, "room"\)\}`\}[^>]*appearance=\{editAppearance \? "resultsEdit" : "default"\}/);
});

test("the obsolete closed input ref stays removed while the real picker ref remains", () => {
  assert.doesNotMatch(hotel, /destinationRef/);
  assert.match(hotel, /const inputRef = useRef<TextInput>\(null\)/);
  assert.match(hotel, /useSearchPickerKeyboardPresentation\(visible, motion\.rendered, value, inputRef, motion\)/);
  assert.match(hotel, /export type HotelSearchHandle = \{ useDestination:/);
  assert.match(hotel, /setNotice\(`\$\{destination\} selected\. Review your details, then search\.`\)/);
});


test("Hotel Results Edit groups the canonical fields above its Search action", () => {
  assert.match(closedFields, /resultsEditFields/);
  assert.match(hotel, /resultsEditFields:\{borderWidth:1,borderRadius:16,overflow:"hidden"\}/);
  assert.equal(closedFields.match(/testID="hotel-results-edit-divider"/g)?.length, 2);
  const destination = closedFields.indexOf('label="Destination"');
  const dates = closedFields.indexOf('label="Travel dates"');
  const guests = closedFields.indexOf('label="Guests"');
  const groupEnd = closedFields.indexOf("</View>", guests);
  const search = closedFields.indexOf('<PrimaryButton appearance="resultsEdit"', groupEnd);
  assert.ok(destination >= 0 && dates > destination && guests > dates && groupEnd > guests && search > groupEnd);
  assert.match(closedFields, /label="Destination"[^>]*trailing=\{false\}/);
  assert.equal(closedFields.match(/trailing=\{false\}/g)?.length, 1);
});

test("Results Edit appearance leaves shared primitive defaults intact", () => {
  assert.match(primitives, /compactField: \{ minHeight: 66, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1/);
  assert.match(primitives, /resultsEditCompactField: \{ minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0/);
  assert.match(primitives, /resultsEditCompactLabel: \{ fontSize: 11, lineHeight: 15, fontWeight: "700", letterSpacing: 1\.1 \}/);
  assert.match(primitives, /resultsEditCompactValue: \{ fontSize: 16, lineHeight: 20, fontWeight: "600" \}/);
  assert.match(primitives, /resultsEditPrimary: \{ minHeight: 52, borderRadius: 12 \}/);
  assert.match(primitives, /resultsEditPrimaryText: \{ fontSize: 16, fontWeight: "600" \}/);
  assert.match(primitives, /appearance\?: "default" \| "resultsEdit"/);
});
