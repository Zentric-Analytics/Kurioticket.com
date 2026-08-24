import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const primitives = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");

const field = (label: string) => {
  const start = panel.indexOf(`<CompactSearchField label="${label}"`);
  assert.notEqual(start, -1);
  return panel.slice(start, panel.indexOf("/>", start) + 2);
};

test("Hotel closed fields use the shared compact field architecture", () => {
  assert.match(panel, /import \{ CompactSearchField, PrimaryButton, UnavailableNotice \} from "\.\/FlowPrimitives"/);
  assert.equal(panel.match(/<CompactSearchField label=/g)?.length, 3);
  assert.doesNotMatch(panel, /<Field label=/);

  assert.match(field("Destination"), /value=\{form\.destination \|\| "City, area, or hotel"\}[\s\S]*muted=\{!form\.destination\}[\s\S]*icon="location"/);
  assert.match(field("Travel dates"), /value=\{datesValue\}[\s\S]*muted=\{!form\.checkIn \|\| !form\.checkOut\}[\s\S]*icon="calendar"/);
  assert.match(field("Guests"), /countLabel\(form\.guests, "guest"\)[\s\S]*countLabel\(form\.rooms, "room"\)[\s\S]*icon="person"/);
});

test("Hotel compact fields keep Hotel copy and shared default chevrons", () => {
  assert.match(panel, /"Check-in — Check-out"/);
  assert.match(panel, /submitLabel = "Search hotels"/);
  assert.doesNotMatch(panel, /<CompactSearchField[^>]*trailing=/);
  assert.doesNotMatch(panel, /Travelers & Rooms/);
  assert.match(primitives, /\{label\.toUpperCase\(\)\}/);
  assert.match(primitives, /<FlowIcon name=\{icon\} size=\{18\}/);
  assert.match(primitives, /trailing \?\? <FlowIcon name="chevron" size=\{16\}/);
});

test("destination handle preserves state, error, and notice behavior without a dead closed input ref", () => {
  assert.match(panel, /export type HotelSearchHandle = \{ useDestination: \(destination: string\) => void \}/);
  assert.match(panel, /const useDestination = \(destination: string\) => \{ setForm[\s\S]*destination: undefined[\s\S]*setNotice\(`/);
  assert.doesNotMatch(panel, /destinationRef/);
  assert.match(panel, /const inputRef = useRef<TextInput>\(null\)/);
  assert.match(panel, /ref=\{inputRef\} accessibilityLabel="Search hotel destinations"/);
});
