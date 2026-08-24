import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const primitives = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");
const compactFields = panel.split("\n").filter((line) => line.includes("<CompactSearchField "));

test("Hotel uses exactly three shared compact closed fields with its existing copy", () => {
  assert.match(panel, /import \{ CompactSearchField, PrimaryButton, UnavailableNotice \} from "\.\/FlowPrimitives"/);
  assert.equal(compactFields.length, 3);
  assert.match(compactFields[0], /label="Destination" value=\{form\.destination \|\| "City, area, or hotel"\} muted=\{!form\.destination\} icon="location"/);
  assert.match(compactFields[1], /label="Travel dates" value=\{datesValue\} muted=\{!form\.checkIn \|\| !form\.checkOut\} icon="calendar"/);
  assert.match(compactFields[2], /label="Guests" value=\{`\$\{countLabel\(form\.guests, "guest"\)\}, \$\{countLabel\(form\.rooms, "room"\)\}`\} icon="person"/);
  assert.doesNotMatch(panel, /<Field label=/);
  assert.match(panel, /"Check-in — Check-out"/);
  assert.match(panel, /submitLabel = "Search hotels"/);
  assert.doesNotMatch(compactFields.join("\n"), /trailing=/);
  assert.doesNotMatch(compactFields.join("\n"), /Travelers & Rooms/);
});

test("only Hotel Travel dates allows two lines and retains datesValue", () => {
  const travelDates = compactFields.find((field) => field.includes('label="Travel dates"')) ?? "";
  const destination = compactFields.find((field) => field.includes('label="Destination"')) ?? "";
  const guests = compactFields.find((field) => field.includes('label="Guests"')) ?? "";
  assert.match(travelDates, /value=\{datesValue\}/);
  assert.match(travelDates, /valueNumberOfLines=\{2\}/);
  assert.doesNotMatch(destination, /valueNumberOfLines/);
  assert.doesNotMatch(guests, /valueNumberOfLines/);
});

test("shared compact presentation retains uppercase labels, icon sizing, default chevron, and one-line default", () => {
  const compact = primitives.slice(primitives.indexOf("export function CompactSearchField"), primitives.indexOf("export function ChoiceSheet"));
  assert.match(compact, /valueNumberOfLines = 1/);
  assert.match(compact, /\{label\.toUpperCase\(\)\}/);
  assert.match(compact, /<FlowIcon name=\{icon\} size=\{18\}/);
  assert.match(compact, /trailing \?\? <FlowIcon name="chevron" size=\{16\}/);
});

test("destination handle keeps behavior while only the real picker input retains a ref", () => {
  assert.match(panel, /export type HotelSearchHandle = \{ useDestination: \(destination: string\) => void \}/);
  assert.match(panel, /const useDestination = \(destination: string\) => \{ setForm\(\(current\) => \(\{ \.\.\.current, destination \}\)\); setErrors\(\(current\) => \(\{ \.\.\.current, destination: undefined \}\)\); setNotice\(`\$\{destination\} selected\. Review your details, then search\.`\); \}/);
  assert.doesNotMatch(panel, /destinationRef/);
  assert.match(panel, /const inputRef = useRef<TextInput>\(null\)/);
  assert.match(panel, /<TextInput ref=\{inputRef\} accessibilityLabel="Search hotel destinations"/);
});
