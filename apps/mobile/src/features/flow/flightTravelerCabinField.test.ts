import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const presentation = readFileSync("src/features/flow/flightSearchPresentation.ts", "utf8");
const fieldStart = panel.indexOf('<CompactSearchField label="Travelers & Cabin Class"');
const field = panel.slice(fieldStart, panel.indexOf("\n", fieldStart));
const sheetStart = panel.indexOf("function TravelerCabinSheet");
const sheet = panel.slice(sheetStart, panel.indexOf("function Cancel", sheetStart));

test("Flights renders one full-width combined Travelers and Cabin Class field", () => {
  assert.equal(panel.match(/<CompactSearchField label="Travelers & Cabin Class"/g)?.length, 1);
  assert.doesNotMatch(panel, /<CompactSearchField label="Cabin"/);
  assert.match(field, /value=\{travelerCabinSummary\}/);
  assert.doesNotMatch(field, /meta=/);
  assert.match(field, /icon="person"/);
  assert.match(field, /trailing=\{<FlowIcon name="chevronDown" size=\{16\} color=\{ft\.colors\.icon\}\/>\}/);
  assert.match(readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8"), /trailing \?\? <FlowIcon name="chevron"/);
  assert.doesNotMatch(field, /styles\.(?:row|half)/);
});

test("the single-line summary composes traveler categories and partial placeholders", () => {
  assert.match(panel, /const travelerCabinSummary = formatTravelerCabinSummary\(form\)/);
  assert.match(presentation, /export function formatTravelerCabinSummary/);
  assert.match(presentation, /form\.adults \? plural\(form\.adults, "adult"\) : undefined/);
  assert.match(presentation, /form\.children \? plural\(form\.children, "child", "children"\) : undefined/);
  assert.match(presentation, /form\.infants \? plural\(form\.infants, "infant"\) : undefined/);
  assert.match(presentation, /return `\$\{travelers \|\| "Select travelers"\}, \$\{form\.cabin \?\? "Select cabin"\}`/);
  assert.doesNotMatch(field, /No travelers selected|travelerBreakdown| · /);
});

test("the disclosure chevron uses the decorative native SVG icon without changing the default chevron", () => {
  const icon = readFileSync("src/features/flow/FlowIcon.tsx", "utf8");
  const primitives = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");

  assert.match(icon, /\| "chevronDown"/);
  assert.match(icon, /chevronDown: <Path \{\.\.\.line\} d="m6 9 6 6 6-6" \/>/);
  assert.match(icon, /<Svg[\s\S]*accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(primitives, /trailing \?\? <FlowIcon name="chevron"/);
});

test("traveler and cabin validation intents open the same combined sheet", () => {
  assert.match(panel, /visible=\{picker === "travelers" \|\| picker === "cabin"\}/);
  assert.match(sheet, /<PickerSheetHeader title="Travelers & Cabin" onClose=\{onCancel\}\/>/);
  assert.match(panel, /const TRAVELER_ROWS = \[[\s\S]*kind: "adults"[\s\S]*kind: "children"[\s\S]*kind: "infants"/);
  assert.match(sheet, /NATIVE_FLIGHT_CABIN_OPTIONS\.map/);
});

test("the combined picker uses a cancellable draft and Done owns commit", () => {
  assert.match(sheet, /if \(visible\) setDraft\(travelerCabinDraft\(form\)\)/);
  assert.match(sheet, /onRequestClose=\{onCancel\}/);
  assert.match(sheet, /onPress=\{\(\)=>setDraft\(\{\.\.\.draft,cabin\}\)\}/);
  assert.match(sheet, /<PrimaryButton label="Done" icon=\{null\} onPress=\{\(\)=>onDone\(draft\)\}/);
  assert.doesNotMatch(sheet, /<Cancel onPress=\{onCancel\}/);
  assert.match(panel, /onDone=\{\(draft\) => \{ setForm\(\{ \.\.\.form, \.\.\.draft \}\); clear\("travelers", "cabin"\); setPicker\(undefined\); \}\}/);
});

test("an empty committed form gets one draft adult without mutating on open", () => {
  assert.match(panel, /adults: totalTravelers\(form\) \? form\.adults : 1/);
  assert.match(field, /onPress=\{\(\) => setPicker\("travelers"\)\}/);
  assert.doesNotMatch(field, /setForm/);
});

test("selected cabin uses radio semantics, themed styling, and a decorative visible checkmark", () => {
  assert.match(sheet, /accessibilityRole="radio" accessibilityState=\{\{selected\}\}/);
  assert.match(sheet, /accessibilityLabel=\{`\$\{cabin\}\$\{selected\?", selected":""\}`\}/);
  assert.match(sheet, /selected&&\{backgroundColor:ft\.colors\.selected,borderColor:ft\.colors\.selectedBorder\}/);
  assert.match(sheet, /<DecorativeIcon icon=\{Armchair\}/);
  assert.match(sheet, /<DecorativeIcon icon=\{Check\}/);
  assert.match(sheet, /<PrimaryButton label="Done" icon=\{null\}/);
});

test("the traveler content matches web wording, grouping, icons, and accessible vector counters", () => {
  assert.match(sheet, />TRAVELERS<\/Text>/);
  assert.match(sheet, /styles\.travelerCard/);
  assert.match(panel, /kind: "adults", label: "Adults", description: "18 years and above", icon: UserRound/);
  assert.match(panel, /kind: "children", label: "Children", description: "2 to 17 years", icon: PersonStanding/);
  assert.match(panel, /kind: "infants", label: "Infants", description: "Under 2 years", icon: Baby/);
  assert.match(sheet, /index<TRAVELER_ROWS\.length-1\?<View testID="traveler-divider"/);
  assert.match(sheet, /icon=\{Minus\}/);
  assert.match(sheet, /icon=\{Plus\}/);
  assert.match(sheet, /accessibilityRole="button" accessibilityLabel=\{label\} accessibilityState=\{\{disabled\}\}/);
  assert.match(sheet, /changeTraveler\(draftForm,kind,delta\)/);
});

test("Flight traveler counters keep 40px visuals and at least 48px effective targets", () => {
  const counter = sheet.slice(sheet.indexOf("function Counter"), sheet.indexOf("function CabinOption"));
  assert.match(counter, /hitSlop=\{4\}/);
  assert.match(panel, /counterButton:\{width:40,height:40/);
});

test("the uncapped baggage tip uses one decorative lightbulb and flexible wrapping copy", () => {
  const tip = sheet.slice(sheet.indexOf("function TipCard"));
  assert.match(tip, /icon=\{Lightbulb\}/);
  assert.match(tip, /<Text style=\{styles\.tipStrong\}>Tip:<\/Text> Baggage allowance may vary by airline\. Check details on the provider page\./);
  assert.doesNotMatch(tip, /numberOfLines/);
  assert.match(panel, /tipCopy:\{flex:1,minWidth:0/);
});
