import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const panel = read("CarSearchPanel.tsx");
const pickers = read("CarSearchPickers.tsx");
const calendar = read("DateRangeSheet.tsx");

test("Cars Results Edit opts into its calendar appearance without changing normal Cars", () => {
  assert.match(panel, /appearance=\{editAppearance \? "carsResultsEdit" : "default"\}/);
  assert.match(pickers, /appearance = "default"/);
  assert.match(pickers, /<DateRangeSheet[^>]+appearance=\{appearance\}/);
});

test("the shared date sheet keeps default appearance opt-in", () => {
  assert.match(calendar, /export type DateRangeSheetAppearance = "default" \| "carsResultsEdit"/);
  assert.match(calendar, /appearance = "default"/);
  assert.match(calendar, /appearance === "carsResultsEdit"/);
});

test("Flights, Hotels, and Packages do not opt into the Cars Results Edit appearance", () => {
  for (const file of ["FlightSearchPanel.tsx", "HotelSearchPanel.tsx", "PackageSearchForm.tsx"]) {
    assert.doesNotMatch(read(file), /carsResultsEdit/, file);
  }
});

test("Cars Results Edit calendar typography is lighter and locally scoped", () => {
  for (const style of [
    'resultsEditRangeLabel:{fontSize:10,lineHeight:14,fontWeight:"600"}',
    'resultsEditRangeValue:{fontSize:13,lineHeight:18,fontWeight:"500"}',
    'resultsEditMonth:{fontSize:16,lineHeight:20,fontWeight:"600"}',
    'resultsEditWeekday:{fontSize:10,lineHeight:14,fontWeight:"500"}',
    'resultsEditDayText:{fontSize:12,lineHeight:16,fontWeight:"400"}',
    'resultsEditSelectedText:{fontWeight:"600"}',
  ]) assert.ok(calendar.includes(style), style);
  assert.match(calendar, /isCarsResultsEdit && styles\.resultsEditMonth/);
  assert.match(calendar, /isCarsResultsEdit && styles\.resultsEditWeekday/);
});

test("compact selection visual retains the full accessible day target", () => {
  assert.match(calendar, /day:\{width:"14\.285%",minHeight:44/);
  assert.match(calendar, /resultsEditDayVisual:\{width:32,height:32,borderRadius:8/);
  assert.match(calendar, /selected&&\{backgroundColor:ft\.colors\.selectedBorder\}/);
  assert.match(calendar, /isToday&&!selected&&\{borderColor:ft\.colors\.selectedBorder,borderWidth:1\}/);
});
