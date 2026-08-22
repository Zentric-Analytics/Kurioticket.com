import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./HotelSearchPanel.tsx", import.meta.url).pathname, "utf8");
const sheet = source.slice(source.indexOf("function HotelGuestsRoomsSheet"));
const model = readFileSync(new URL("./hotelSearchModel.ts", import.meta.url).pathname, "utf8");

test("hotel picker exposes the complete website content in native order", () => {
  const concepts = ["Guests &amp; Rooms", 'label="Adults"', "Ages 18+", 'label="Children"', "Ages 0–17", 'label="Rooms"', "Separate rooms", "Pet-friendly", "Only show stays that allow pets", 'label="Done"'];
  let previous = -1;
  for (const concept of concepts) {
    const index = sheet.indexOf(concept);
    assert.ok(index > previous, `${concept} should be present in order`);
    previous = index;
  }
  assert.doesNotMatch(source, /Guests and rooms/);
  assert.doesNotMatch(source, /function CountModal/);
});

test("hotel picker uses bounded separate drafts and commits their total only on Done", () => {
  assert.match(source, /const \[draft, setDraft\] = useState<GuestsRoomsDraft>/);
  assert.match(source, /if \(visible\) setDraft\(\{ adults, children, rooms, petFriendly \}\)/);
  assert.match(source, /maximum=\{HOTEL_LIMITS\.guests\.max - draft\.children\}/);
  assert.match(source, /maximum=\{HOTEL_LIMITS\.guests\.max - draft\.adults\}/);
  assert.match(source, /minimum=\{HOTEL_LIMITS\.rooms\.min\} maximum=\{HOTEL_LIMITS\.rooms\.max\}/);
  assert.match(source, /guests: draft\.adults \+ draft\.children, rooms: draft\.rooms/);
  assert.match(source, /onRequestClose=\{onCancel\}/);
  assert.match(source, /onPress=\{onCancel\}/);
  assert.match(source, /onPress=\{\(\) => onDone\(draft\)\}/);
});

test("pet-friendly is an accessible committed draft without an invented search parameter", () => {
  assert.match(source, /accessibilityRole="switch" accessibilityState=\{\{ checked: draft\.petFriendly \}\}/);
  assert.match(source, /setPetFriendly\(draft\.petFriendly\)/);
  const serializer = model.slice(model.indexOf("export const hotelSearchParams"));
  assert.doesNotMatch(serializer, /petFriendly/);
});

test("sheet uses theme surface, safe area, and separate backdrop layers", () => {
  assert.match(source, /backgroundColor: ft\.colors\.surface/);
  assert.match(source, /<SafeAreaView edges=\{\["bottom"\]\}/);
  assert.match(source, /StyleSheet\.absoluteFill/);
  assert.doesNotMatch(source, /backgroundColor:\s*["']white["']/);
});


test("Guests and Rooms Done is explicitly iconless", () => {
  assert.match(sheet, /<PrimaryButton label="Done" icon=\{null\} onPress=\{\(\) => onDone\(draft\)\}\/>/);
});
