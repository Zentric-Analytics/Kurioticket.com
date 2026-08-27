import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);

const start = source.indexOf("function renderMobileControlsRow()");
const end = source.indexOf("function renderDesktopSortControl()", start);
const summary = source.slice(start, end);

test("mobile search summary remains the compact whole-card Edit Search launcher", () => {
  assert.ok(start >= 0);
  assert.match(
    summary,
    /<button[\s\S]*onClick=\{\(event\) => openMobileSearchDrawer\(event\.currentTarget\)\}/,
  );
  assert.match(summary, /\{mobileRouteSummary\}/);
  assert.match(summary, /\{mobileTripTypeSummary\} · \{mobileDateSummary\} ·/);
  assert.match(
    summary,
    /\{mobileTravelerSummary\} · \{mobileCabinClassSummary\}/,
  );
  assert.match(
    source,
    /const mobileCabinClassSummary = cabinClassLabel\(cabinClassInput, t\);/,
  );
  assert.doesNotMatch(summary, /Economy/);
  assert.match(summary, /<SquarePen size=\{16\} strokeWidth=\{2\.2\} \/>/);
});

test("mobile search summary uses the refined compact neutral card system", () => {
  assert.match(summary, /h-16/);
  assert.match(summary, /rounded-\[13px\]/);
  assert.match(summary, /border-\[#D8E1EC\]/);
  assert.match(summary, /bg-white/);
  assert.match(summary, /px-4 py-0/);
  assert.match(summary, /shadow-\[0_6px_18px_-16px_rgba\(15,23,42,0\.32\)\]/);
  assert.match(summary, /truncate text-\[16px\] font-bold leading-5/);
  assert.match(
    summary,
    /mt-\[3px\] block truncate text-\[12\.5px\] font-semibold leading-\[17px\] text-slate-600/,
  );
  assert.match(
    summary,
    /h-11 w-11[\s\S]*rounded-\[10px\][\s\S]*border-transparent bg-transparent text-slate-700/,
  );
  assert.doesNotMatch(summary, /border-\[#D8E1EC\] bg-slate-50 text-slate-700/);
  assert.doesNotMatch(summary, /gradient|inset_|Edit search/i);
});

test("full Edit Search controls are not duplicated into the compact summary", () => {
  assert.doesNotMatch(
    summary,
    /renderMobileAirportField|MobileAirportPicker|MobileDatePicker|handleMobileSearchSubmit/,
  );
});
