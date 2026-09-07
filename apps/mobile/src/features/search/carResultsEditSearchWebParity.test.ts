import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLocationFieldDisplay } from "../../../../../src/lib/search/locationFieldDisplay";
import { localDateFromIso } from "../flow/localDateModel";

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url) as unknown as string, "utf8");
const modal = readSource("./CarEditSearchModal.tsx");
const panel = readSource("../flow/CarSearchPanel.tsx");
const webResults = readSource("../../../../../src/components/results/CarsResultsClient.tsx");
const webSheet = readSource("../../../../../src/components/search/MobileResultsEditSheet.tsx");

test("native Results edit uses the web title and retained sheet contract", () => {
  assert.match(webResults, /title=\{t\("carsResults\.editSearch"\)\}/);
  assert.match(modal, />\s*Edit search\s*</);
  assert.doesNotMatch(modal, />\s*Edit car search\s*</);
  for (const token of ["maxHeight: \"94%\"", "borderTopLeftRadius: 22", "minHeight: 60", "KeyboardAvoidingView", "onRequestClose={onClose}", "submitNavigation=\"replace\"", "onBeforeNavigate={onClose}"]) assert.ok(modal.includes(token), token);
  assert.match(webSheet, /rounded-t-\[22px\]/);
});

test("Cars edit owns one compact grouped surface and web typography", () => {
  assert.match(modal, /<CarSearchPanel[\s\S]*editAppearance/);
  assert.match(panel, /editAppearance \? editRows/);
  for (const style of ["borderWidth:1", "borderRadius:14", "overflow:\"hidden\"", "#D8E1EC", "#E2E8F0", "minHeight:64", "paddingHorizontal:16", "paddingVertical:8", "fontSize:10", "lineHeight:16", "fontWeight:\"700\"", "letterSpacing:1.2", "fontSize:16", "lineHeight:20", "fontWeight:\"500\""]) assert.ok(panel.includes(style), style);
  assert.doesNotMatch(panel.match(/resultsEditRow:\{[^}]+\}/)?.[0] ?? "", /minHeight:72/);
  for (const label of ["PICKUP LOCATION", "RENTAL DATES", "PICK-UP / RETURN TIME", "DRIVER AGE", "RETURN LOCATION"]) assert.ok(panel.includes(`label="${label}"`), label);
});

test("Cars edit rows use the web icon and disclosure contract", () => {
  const editRows = panel.slice(panel.indexOf("const editRows"), panel.indexOf("return <View", panel.indexOf("const editRows")));
  assert.match(editRows, /label="PICKUP LOCATION"[^\n]*icon="location"[^\n]*onPress/);
  assert.doesNotMatch(editRows.match(/label="PICKUP LOCATION"[^\n]+/)?.[0] ?? "", /disclosure|chevron/);
  for (const [label, icon] of [["RENTAL DATES", "calendar"], ["PICK-UP / RETURN TIME", "clock"], ["DRIVER AGE", "person"]]) assert.match(editRows, new RegExp(`label="${label.replace("/", "\\/")}"[^\\n]*icon="${icon}"[^\\n]*disclosure`));
  assert.match(panel, /disclosure \? <FlowIcon name="chevronDown"/);
  assert.doesNotMatch(editRows, /name="chevron"/);
});

test("Results edit dates omit weekdays without changing the normal summary", () => {
  const format = (iso: string) => localDateFromIso(iso)?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const summary = `${format("2026-09-07")} — ${format("2026-09-09")}`;
  assert.equal(summary, "Sep 7, 2026 — Sep 9, 2026");
  assert.doesNotMatch(summary, /Mon|Wed/);
  assert.match(panel, /const displayDate = [^\n]*weekday: "short"/);
  assert.match(panel, /displayResultsEditDate[\s\S]*localDateFromIso/);
});

test("Results edit preserves raw location truth while presenting primary and supporting text", () => {
  const raw = "Paris, France";
  assert.deepEqual(getLocationFieldDisplay(raw), { primary: "Paris", secondary: "France" });
  assert.equal(raw, "Paris, France");
  assert.match(panel, /value=\{pickupLocationDisplay\.primary \|\| form\.pickupLocation\.trim\(\)/);
  assert.match(panel, /secondary=\{pickupLocationDisplay\.secondary\}/);
  assert.match(panel, /carSearchParams\(form\)/);
});

test("Results edit suppresses only the landing checkbox and supports different return", () => {
  assert.match(panel, /\{!editAppearance \? <Pressable accessibilityRole="checkbox"/);
  assert.match(panel, /form\.separateDropoff \? <ResultsEditRow divided label="RETURN LOCATION"/);
  assert.match(panel, /actionLabel="Same as pickup"/);
  assert.match(panel, /separateDropoff: false, dropoffLocation: ""/);
  assert.match(panel, /form\.separateDropoff \? <FieldError[\s\S]*label="Drop-off location"/);
});

test("Results edit CTA matches mobile web without changing the default CTA", () => {
  for (const style of ["height:48", "minHeight:48", "width:\"100%\"", "marginTop:13", "borderRadius:10", "backgroundColor:\"#004BB8\"", "fontSize:15", "fontWeight:\"600\""]) assert.ok(panel.includes(style), style);
  assert.match(panel, /styles\.resultsEditSubmitText\}>\{submitLabel\}/);
  assert.match(panel, /<PrimaryButton label=\{submitLabel\} icon=\{null\}/);
  assert.doesNotMatch(panel.match(/resultsEditSubmit:\{[^}]+\}/)?.[0] ?? "", /minHeight:54/);
});
