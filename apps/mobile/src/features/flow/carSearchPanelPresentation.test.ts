import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatTime, rentalTimesSummary, selectRentalRangeDate } from "./carSearchModel";

const panel = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const pickers = readFileSync("src/features/flow/CarSearchPickers.tsx", "utf8");
const dateRange = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");
const icons = readFileSync("src/features/flow/FlowIcon.tsx", "utf8") + readFileSync("src/features/flow/flowIconTypes.ts", "utf8");

test("Cars main selectors use a polished independent-card treatment without changing Results Edit", () => {
  const mainRows = panel.slice(panel.indexOf("const mainRows"), panel.indexOf("const editRows"));
  const fields = [
    ["PICKUP LOCATION", "location"],
    ["DROP-OFF LOCATION", "location"],
    ["RENTAL DATES", "calendar"],
    ["PICK-UP / RETURN TIME", "clock"],
    ["DRIVER AGE", "person"],
  ] as const;

  assert.match(mainRows, /<View style=\{styles\.mainStack\}>/);
  assert.equal((mainRows.match(/<View style=\{mainCardStyle\}>/g) ?? []).length, fields.length);
  assert.equal((mainRows.match(/<ResultsEditRow /g) ?? []).length, fields.length);
  for (const [label, icon] of fields) {
    assert.match(mainRows, new RegExp(`<ResultsEditRow label="${label.replace("/", "\\/")}" appearance="main"[^\n]*icon="${icon}"`));
  }
  assert.match(panel, /editCardStyle = \[styles\.resultsEditCard, \{ backgroundColor: ft\.colors\.card, borderColor: ft\.colors\.border \}\]/);
  assert.match(panel, /mainCardStyle = \[styles\.mainCard, \{ backgroundColor: ft\.colors\.card, borderColor: ft\.colors\.border \}\]/);
  assert.match(panel, /mainStack:\{width:"100%",gap:8\}/);
  assert.match(panel, /mainCard:\{width:"100%",borderWidth:StyleSheet\.hairlineWidth,borderRadius:15,overflow:"hidden"\}/);
  assert.match(panel, /mainRow:\{minHeight:66,paddingHorizontal:12,paddingVertical:9\}/);
  assert.match(panel, /mainCopy:\{gap:4\}/);
  assert.match(panel, /mainLabel:\{fontSize:10,lineHeight:13,fontWeight:"800",letterSpacing:0\.5\}/);
  assert.match(panel, /mainValue:\{fontSize:15,lineHeight:20,fontWeight:"600"\}/);
  assert.match(panel, /mainSecondary:\{fontSize:12,lineHeight:16\}/);
  assert.match(panel, /mainIconSlot:\{width:18,alignItems:"center",justifyContent:"center"\}/);
  assert.match(panel, /mainDisclosureSlot:\{width:16,alignItems:"center",justifyContent:"center"\}/);
  assert.match(panel, /<FlowIcon name=\{icon\} size=\{mainAppearance \? 18 : 16\}/);
  assert.match(panel, /<FlowIcon name="chevronDown" size=\{mainAppearance \? 16 : 18\}/);
  assert.doesNotMatch(mainRows, /CompactSearchField|borderTopWidth|divider/);
});

test("Cars keeps the checkbox semantics, toggle, conditional drop-off, selected check, and stale target clearing", () => {
  const mainRows = panel.slice(panel.indexOf("const mainRows"), panel.indexOf("const editRows"));
  assert.match(panel, /accessibilityRole="checkbox"[^\n]*accessibilityState=\{\{ checked: form\.separateDropoff \}\}/);
  assert.match(panel, /onPress=\{\(\) => setForm\(\{ \.\.\.form, separateDropoff: !form\.separateDropoff,[^\n]*dropoffLocationTarget: undefined/);
  assert.match(mainRows, /form\.separateDropoff \? <FieldError[^\n]*label="DROP-OFF LOCATION"/);
  assert.match(panel, /form\.separateDropoff \? <FlowIcon name="check" color="white" size=\{15\}\/> : null/);
});

test("Cars presents one unified date field and one unified time field in form order", () => {
  const mainRows = panel.slice(panel.indexOf("const mainRows"), panel.indexOf("const editRows"));
  assert.equal((mainRows.match(/label="RENTAL DATES"/g) ?? []).length, 1);
  assert.equal((mainRows.match(/label="PICK-UP \/ RETURN TIME"/g) ?? []).length, 1);
  const order = ["PICKUP LOCATION", "DROP-OFF LOCATION", "RENTAL DATES", "PICK-UP / RETURN TIME", "DRIVER AGE"];
  let cursor = -1; for (const marker of order) { const next=mainRows.indexOf(marker,cursor+1); assert.ok(next>cursor,`${marker} must follow the preceding control`); cursor=next; }
});

test("Cars keeps the return-location checkbox after and outside the optional submit CTA", () => {
  const submitStart = panel.indexOf('<View style={styles.mainSubmit}><PrimaryButton');
  const submitEnd = panel.indexOf("</View>", submitStart) + "</View>".length;
  const checkboxStart = panel.indexOf('<Pressable accessibilityRole="checkbox"', submitEnd);
  assert.ok(submitStart >= 0 && submitEnd > submitStart, "the optional submit block must exist");
  assert.ok(checkboxStart > submitEnd, "the checkbox must follow and remain outside the showSubmit block");
  assert.equal((panel.match(/<Pressable accessibilityRole="checkbox"/g) ?? []).length, 1);
});

test("Cars paired summaries are safely constrained inside flexible cards", () => {
  const mainRows = panel.slice(panel.indexOf("const mainRows"), panel.indexOf("const editRows"));
  assert.match(mainRows, /label="RENTAL DATES"[^\n]*disclosure/);
  assert.match(mainRows, /label="PICK-UP \/ RETURN TIME"[^\n]*disclosure/);
  assert.match(panel, /resultsEditText:\{flex:1,minWidth:0\}/);
  assert.match(panel, /<Text numberOfLines=\{1\} style=\{\[styles\.resultsEditValue/);
});

test("Cars summaries cover empty, partial, and complete values with Return terminology", () => {
  const dateSummary = panel.match(/export const rentalDatesSummary[\s\S]*?;/)?.[0] ?? "";
  assert.match(dateSummary, /pickupDate \? displayDate\(pickupDate\) : "Pickup date"/);
  assert.match(dateSummary, /returnDate \? displayDate\(returnDate\) : "Return date"/);
  assert.doesNotMatch(dateSummary, /Select (?:pick-up|return) date/);
  assert.equal(rentalTimesSummary("",""), "Select pick-up time — Select return time");
  assert.equal(rentalTimesSummary("10:00",""), `${formatTime("10:00")} — Select return time`);
  assert.doesNotMatch(rentalTimesSummary("10:00","10:30"), /Select/);
  assert.doesNotMatch(panel + pickers, /Drop-off (?:date|time)|drop-off (?:date|time)/);
  assert.match(pickers, /Pick-up date/); assert.match(pickers, /Return date/); assert.match(pickers, /Pick-up time/); assert.match(pickers, /Return time/);
});

test("rental range selection starts, completes including same day, and restarts", () => {
  assert.deepEqual(selectRentalRangeDate("2026-09-03","2026-09-06","2026-09-10"),{pickupDate:"2026-09-10",returnDate:""});
  assert.deepEqual(selectRentalRangeDate("2026-09-03","","2026-09-06"),{pickupDate:"2026-09-03",returnDate:"2026-09-06"});
  assert.deepEqual(selectRentalRangeDate("2026-09-03","","2026-09-03"),{pickupDate:"2026-09-03",returnDate:"2026-09-03"});
  assert.deepEqual(selectRentalRangeDate("2026-09-03","","2026-09-02"),{pickupDate:"2026-09-02",returnDate:""});
});

test("combined pickers preserve draft, dismissal, accessibility, range, and two-list structure", () => {
  assert.match(dateRange, /setDraftStart\(startDate\)[\s\S]*setDraftEnd\(endDate\)/);
  assert.match(dateRange, /onRequestClose=\{onCancel\}/);
  assert.match(dateRange, /accessibilityViewIsModal/g);
  assert.match(dateRange, /disabled=\{!valid\}/g);
  assert.match(dateRange, /iso<minimumStartDate/);
  assert.match(dateRange, /inRange/);
  assert.match(pickers, /timeColumns:\{flex:1,flexDirection:"row"/);
  assert.equal((pickers.match(/<TimeColumn label=/g) ?? []).length,2);
  assert.match(pickers, /timeOptions\.map/);
  assert.doesNotMatch(pickers, /✓|position:"absolute"|margin(?:Left|Right|Top|Bottom):-|Platform\.OS/);
});

test("time rows keep horizontal separators and selected treatment without vertical rails", () => {
  const timeChoice = pickers.match(/timeChoice:\{([^}]*)\}/)?.[1] ?? "";

  assert.match(timeChoice, /borderBottomWidth:1/);
  assert.doesNotMatch(timeChoice, /borderLeftWidth/);
  assert.match(pickers, /\{borderBottomColor:ft\.colors\.border\}/);
  assert.doesNotMatch(pickers, /borderLeftColor/);
  assert.match(pickers, /chosen&&\{backgroundColor:ft\.colors\.selected\}/);
  assert.match(pickers, /accessibilityState=\{\{selected:chosen\}\}/);
  assert.match(pickers, /chosen\?<FlowIcon name="check"/);
});

test("Cars main fields use the Results Edit icon and disclosure contract", () => {
  const mainRows = panel.slice(panel.indexOf("const mainRows"), panel.indexOf("const editRows"));
  assert.match(mainRows, /label="PICKUP LOCATION"[^\n]*icon="location"[^\n]*onPress/);
  assert.doesNotMatch(mainRows.match(/label="PICKUP LOCATION"[^\n]+/)?.[0] ?? "", /disclosure/);
  for (const [label, icon] of [["RENTAL DATES", "calendar"], ["PICK-UP / RETURN TIME", "clock"], ["DRIVER AGE", "person"]]) assert.match(mainRows, new RegExp(`label="${label.replace("/", "\\/")}"[^\n]*icon="${icon}"[^\n]*disclosure`));
});

test("Cars Search and time Done CTAs are iconless while selection checks remain", () => {
  assert.match(panel, /<PrimaryButton label=\{submitLabel\} icon=\{null\} onPress=\{submit\}\/>/);
  assert.match(pickers, /<PrimaryButton label="Done" icon=\{null\} disabled=\{!draftPickup\|\|!draftReturn\} onPress=\{\(\)=>onDone\(draftPickup,draftReturn\)\}\/>/);
  assert.match(pickers, /chosen\?<FlowIcon name="check"/);
});

test("Cars keeps the separate-return checkbox selection check", () => {
  assert.match(panel, /form\.separateDropoff \? <FlowIcon name="check" color="white" size=\{15\}\/\> : null/);
});

test("Cars Results edit behavior remains isolated while field visuals are shared", () => {
  assert.match(panel, /editAppearance = false/);
  assert.match(panel, /\{editAppearance \? editRows : <>/);
  assert.match(panel, /\{!editAppearance \? <Pressable accessibilityRole="checkbox"/);
  assert.match(panel, /editAppearance \? <Pressable[\s\S]*styles\.resultsEditSubmit/);
  assert.match(panel, /const displayDate = [^\n]*weekday: "short"/);
  assert.match(panel, /resultsEditRentalDatesSummary\(form\.pickupDate, form\.dropoffDate\)/);
});
