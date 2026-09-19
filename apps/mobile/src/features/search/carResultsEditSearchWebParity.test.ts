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
  for (const token of ["maxHeight: \"88%\"", "FLIGHT_QUICK_SHEET_HORIZONTAL_INSET", "FLIGHT_FLOATING_SHEET_BOTTOM_GAP", "borderTopLeftRadius: 24", "borderBottomLeftRadius: 24", "minHeight: 52", "KeyboardAvoidingView", "onRequestClose={onClose}", "submitNavigation=\"replace\"", "onBeforeNavigate={onClose}"]) assert.ok(modal.includes(token), token);
  assert.doesNotMatch(modal, /maxHeight: \"94%\"|borderTopLeftRadius: 22|minHeight: 60/);
  assert.match(webSheet, /rounded-t-\[22px\]/);
});

test("Cars edit uses a neutral stack of independent cards with polished typography", () => {
  assert.match(modal, /<CarSearchPanel[\s\S]*editAppearance/);
  assert.match(panel, /editAppearance \? editRows/);
  const stack = panel.match(/resultsEditStack:\{[^}]+\}/)?.[0] ?? "";
  const card = panel.match(/resultsEditCard:\{[^}]+\}/)?.[0] ?? "";
  const row = panel.match(/resultsEditRow:\{[^}]+\}/)?.[0] ?? "";
  for (const style of ["width:\"100%\"", "gap:10"]) assert.ok(stack.includes(style), style);
  assert.doesNotMatch(stack, /borderWidth|backgroundColor|borderRadius|overflow/);
  for (const style of ["width:\"100%\"", "borderWidth:1", "borderRadius:13", "overflow:\"hidden\""]) assert.ok(card.includes(style), style);
  for (const style of ["minHeight:70", "paddingHorizontal:16", "paddingVertical:10"]) assert.ok(row.includes(style), style);
  for (const style of [
    'resultsEditLabel:{fontSize:10,lineHeight:14,fontWeight:"600",letterSpacing:1}',
    'resultsEditValue:{fontSize:14,lineHeight:19,fontWeight:"500"}',
    'resultsEditSecondary:{fontSize:11,lineHeight:15,fontWeight:"400"}',
    'resultsEditActionText:{fontSize:11,lineHeight:15,fontWeight:"500"}',
  ]) assert.ok(panel.includes(style), style);
  for (const label of ["PICKUP LOCATION", "RENTAL DATES", "PICK-UP / RETURN TIME", "DRIVER AGE", "RETURN LOCATION"]) assert.ok(panel.includes(`label="${label}"`), label);
});

test("Cars edit wraps every logical field independently without divider joins", () => {
  const editRows = panel.slice(panel.indexOf("const editRows"), panel.indexOf("return <View", panel.indexOf("const editRows")));
  assert.match(editRows, /<View style=\{styles\.resultsEditStack\}>/);
  assert.equal((editRows.match(/<View style=\{editCardStyle\}>/g) ?? []).length, 5);
  assert.match(panel, /editCardStyle = \[styles\.resultsEditCard, \{ backgroundColor: ft\.colors\.card, borderColor: ft\.colors\.border \}\]/);
  assert.doesNotMatch(editRows, /divided|borderTopWidth/);
  assert.doesNotMatch(panel, /resultsEditGroup|dividerColor/);
  assert.doesNotMatch(panel.match(/resultsEditRow:\{[^}]+\}/)?.[0] ?? "", /borderTopWidth/);
  assert.ok(panel.indexOf("styles.resultsEditSubmit") > panel.indexOf("const editRows"), "Search remains after the independent-card stack");
  assert.equal((editRows.match(/<ResultsEditRow /g) ?? []).length, 5);
  assert.equal((editRows.match(/onPress=/g) ?? []).length, 5);
});

test("Cars edit rows use the web icon and disclosure contract", () => {
  const editRows = panel.slice(panel.indexOf("const editRows"), panel.indexOf("return <View", panel.indexOf("const editRows")));
  assert.match(editRows, /label="PICKUP LOCATION"[^\n]*icon="location"[^\n]*onPress/);
  assert.doesNotMatch(editRows.match(/label="PICKUP LOCATION"[^\n]+/)?.[0] ?? "", /disclosure|chevron/);
  for (const [label, icon] of [["RENTAL DATES", "calendar"], ["PICK-UP / RETURN TIME", "clock"], ["DRIVER AGE", "person"]]) assert.match(editRows, new RegExp(`label="${label.replace("/", "\\/")}"[^\\n]*icon="${icon}"[^\\n]*disclosure`));
  assert.match(panel, /disclosure \? <View[^>]*><FlowIcon name="chevronDown"/);
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
  assert.match(panel, /form\.separateDropoff \? <View style=\{editCardStyle\}><ResultsEditRow label="RETURN LOCATION"/);
  assert.match(panel, /actionLabel="Same as pickup"/);
  assert.match(panel, /separateDropoff: false, dropoffLocation: ""/);
  assert.match(panel, /form\.separateDropoff \? <FieldError[\s\S]*label="DROP-OFF LOCATION"/);
});

test("Results edit CTA matches mobile web without changing the default CTA", () => {
  for (const style of ["height:48", "minHeight:48", "width:\"100%\"", "marginTop:13", "borderRadius:10", "backgroundColor:\"#004BB8\""]) assert.ok(panel.includes(style), style);
  assert.ok(panel.includes('resultsEditSubmitText:{color:"#FFFFFF",fontSize:14,lineHeight:18,fontWeight:"600"}'));
  assert.match(panel, /styles\.resultsEditSubmitText\}>\{submitLabel\}/);
  assert.match(panel, /<PrimaryButton label=\{submitLabel\} icon=\{null\}/);
  assert.doesNotMatch(panel.match(/resultsEditSubmit:\{[^}]+\}/)?.[0] ?? "", /minHeight:54/);
});
