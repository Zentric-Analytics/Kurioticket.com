import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const fieldStart = panel.indexOf('<Field label="Travelers"');
const field = panel.slice(fieldStart, panel.indexOf("\n", fieldStart));
const sheetStart = panel.indexOf("function TravelerCabinSheet");
const sheet = panel.slice(sheetStart, panel.indexOf("function Counter", sheetStart));

test("Flights renders one full-width combined Travelers field", () => {
  assert.equal(panel.match(/<Field label="Travelers"/g)?.length, 1);
  assert.doesNotMatch(panel, /<Field label="Cabin"/);
  assert.match(field, /value=\{travelerCabinSummary\}/);
  assert.match(field, /meta=\{travelerBreakdown\}/);
  assert.match(field, /icon="person"/);
  assert.equal(field.match(/name="chevron"/g)?.length, 1);
  assert.doesNotMatch(field, /styles\.(?:row|half)/);
});

test("the summary and breakdown cover selected and missing values", () => {
  assert.match(panel, /const travelerValue = travelerCount \? plural\(travelerCount, "traveler"\) : "Select travelers";/);
  assert.match(panel, /const travelerCabinSummary = `\$\{travelerValue\} · \$\{form\.cabin \?\? "Select cabin"\}`;/);
  assert.match(panel, /const travelerBreakdown = travelerCount \? `\$\{plural\(form\.adults,"adult"\)\} · \$\{plural\(form\.children,"child","children"\)\} · \$\{plural\(form\.infants,"infant"\)\}` : "No travelers selected";/);
});

test("traveler and cabin validation intents open the same combined sheet", () => {
  assert.match(panel, /visible=\{picker === "travelers" \|\| picker === "cabin"\}/);
  assert.match(sheet, /Travelers &amp; Cabin/);
  assert.match(sheet, /\["adults","children","infants"\]/);
  assert.match(sheet, /NATIVE_FLIGHT_CABIN_OPTIONS\.map/);
});

test("the combined picker uses a cancellable draft and Done owns commit", () => {
  assert.match(sheet, /if \(visible\) setDraft\(travelerCabinDraft\(form\)\)/);
  assert.match(sheet, /onRequestClose=\{onCancel\}/);
  assert.match(sheet, /onPress=\{\(\)=>setDraft\(\{\.\.\.draft,cabin\}\)\}/);
  assert.match(sheet, /<PrimaryButton label="Done" onPress=\{\(\)=>onDone\(draft\)\}/);
  assert.match(sheet, /<Cancel onPress=\{onCancel\}/);
  assert.match(panel, /onDone=\{\(draft\) => \{ setForm\(\{ \.\.\.form, \.\.\.draft \}\); clear\("travelers", "cabin"\); setPicker\(undefined\); \}\}/);
});

test("an empty committed form gets one draft adult without mutating on open", () => {
  assert.match(panel, /adults: totalTravelers\(form\) \? form\.adults : 1/);
  assert.match(field, /onPress=\{\(\) => setPicker\("travelers"\)\}/);
  assert.doesNotMatch(field, /setForm/);
});
