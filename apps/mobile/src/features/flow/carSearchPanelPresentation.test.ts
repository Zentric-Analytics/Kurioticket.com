import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatTime, rentalTimesSummary, selectRentalRangeDate } from "./carSearchModel";

const panel = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const pickers = readFileSync("src/features/flow/CarSearchPickers.tsx", "utf8");
const dateRange = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");
const icons = readFileSync("src/features/flow/FlowIcon.tsx", "utf8");

test("Cars presents one unified date field and one unified time field in form order", () => {
  assert.equal((panel.match(/<Field label="Rental dates"/g) ?? []).length, 1);
  assert.equal((panel.match(/<Field label="Pick-up \/ Return time"/g) ?? []).length, 1);
  assert.doesNotMatch(panel, /<Field label="(?:Pick-up|Drop-off) (?:date|time)"/);
  assert.match(panel, /label="Rental dates"[\s\S]*icon="calendar"/);
  assert.match(panel, /label="Pick-up \/ Return time"[\s\S]*icon="clock"/);
  const order = ["Pick-up location", "Return to a different location", "Drop-off location", "Rental dates", "Pick-up / Return time", "Driver age", "PrimaryButton"];
  let cursor = -1; for (const marker of order) { const next=panel.indexOf(marker,cursor+1); assert.ok(next>cursor,`${marker} must follow the preceding control`); cursor=next; }
});

test("Cars summaries cover empty, partial, and complete values with Return terminology", () => {
  assert.match(panel, /pickupDate \? displayDate\(pickupDate\) : "Select pick-up date"/);
  assert.match(panel, /returnDate \? displayDate\(returnDate\) : "Select return date"/);
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

test("Cars keeps person and themed chevron icons and FlowIcon clock", () => {
  assert.match(panel, /label="Driver age"[\s\S]*icon="person"[\s\S]*name="chevron" color=\{ft\.colors\.icon\}/);
  assert.match(icons, /\| "clock" \| "close"/);
  assert.match(icons, /clock: <><Circle \{\.\.\.line\}[\s\S]*?<Path \{\.\.\.line\}/);
});


test("Cars Search and time Done CTAs are iconless while selection checks remain", () => {
  assert.match(panel, /<PrimaryButton label=\{submitLabel\} icon=\{null\} onPress=\{submit\}\/>/);
  assert.match(pickers, /<PrimaryButton label="Done" icon=\{null\} disabled=\{!draftPickup\|\|!draftReturn\} onPress=\{\(\)=>onDone\(draftPickup,draftReturn\)\}\/>/);
  assert.match(pickers, /chosen\?<FlowIcon name="check"/);
});

test("Cars keeps the separate-return checkbox selection check", () => {
  assert.match(panel, /form\.separateDropoff \? <FlowIcon name="check" color="white" size=\{15\}\/> : null/);
});
