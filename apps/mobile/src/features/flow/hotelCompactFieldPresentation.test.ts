import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotel = readFileSync(new URL("./HotelSearchPanel.tsx", import.meta.url).pathname, "utf8");
const packages = readFileSync(new URL("./PackageSearchForm.tsx", import.meta.url).pathname, "utf8");
const closedFields = hotel.slice(hotel.indexOf("return <View"), hotel.indexOf("<DateRangeSheet"));

test("Hotel closed rows reuse the Packages CompactSearchField architecture", () => {
  assert.match(hotel, /import \{ CompactSearchField, PrimaryButton, UnavailableNotice \} from "\.\/FlowPrimitives"/);
  assert.match(packages, /import \{ CompactSearchField, PrimaryButton \} from "\.\/FlowPrimitives"/);
  assert.equal(closedFields.match(/<CompactSearchField/g)?.length, 3);
  assert.doesNotMatch(closedFields, /<Field\b|trailing=|locationFieldRow|locationFieldContent/);
  assert.doesNotMatch(hotel, /function (?:HotelCompactField|HotelSearchRow|PackageStyleHotelField)/);
});

test("Destination uses the Hotel wording and shared location row", () => {
  assert.match(closedFields, /<CompactSearchField label="Destination" value=\{form\.destination \|\| "City, area, or hotel"\} muted=\{!form\.destination\} icon="location" onPress=\{\(\) => setDestinationOpen\(true\)\}\/?>/);
});

test("Travel dates alone opt into unlimited wrapping", () => {
  assert.match(closedFields, /<CompactSearchField label="Travel dates" value=\{datesValue\} muted=\{!form\.checkIn \|\| !form\.checkOut\} icon="calendar" valueNumberOfLines=\{0\} onPress=\{\(\) => setDatesOpen\(true\)\}\/?>/);
  assert.doesNotMatch(closedFields, /label="Travel dates"[^>]*valueNumberOfLines=\{[12]\}/);
  assert.doesNotMatch(closedFields, /label="Destination"[^>]*valueNumberOfLines/);
  assert.doesNotMatch(closedFields, /label="Guests"[^>]*valueNumberOfLines/);
});

test("Guests keeps the existing Hotel count summary in the shared person row", () => {
  assert.match(closedFields, /<CompactSearchField label="Guests" value=\{`\$\{countLabel\(form\.guests, "guest"\)\}, \$\{countLabel\(form\.rooms, "room"\)\}`\} icon="person" onPress=\{\(\) => setCountsOpen\(true\)\}\/?>/);
});

test("the obsolete closed input ref stays removed while the real picker ref remains", () => {
  assert.doesNotMatch(hotel, /destinationRef/);
  assert.match(hotel, /const inputRef = useRef<TextInput>\(null\)/);
  assert.match(hotel, /inputRef\.current\?\.focus\(\)/);
  assert.match(hotel, /export type HotelSearchHandle = \{ useDestination:/);
  assert.match(hotel, /setNotice\(`\$\{destination\} selected\. Review your details, then search\.`\)/);
});
