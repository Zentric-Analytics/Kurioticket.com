import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");
const compactStart = form.indexOf('const mobileHomepageControls');
const compactEnd = form.indexOf('\n  return (', compactStart);
const compact = form.slice(compactStart, compactEnd);

test("mobile homepage presentation exposes exactly two canonical package modes", () => {
  assert.match(form, /presentation\\?: "default" \\| "mobile-homepage"/);
  assert.match(compact, /\\["hotel-flight", "Flight \\+ Hotel"\\]/);
  assert.match(compact, /\\["hotel-flight-car", "Flight \\+ Hotel \\+ Car"\\]/);
  assert.equal((compact.match(/data-deals-mode=/g) ?? []).length, 1);
  assert.doesNotMatch(compact, /Flight \\+ Car|Hotel \\+ Car/);
  assert.match(compact, /selectPackageMode\\(mode\\)/);
  assert.match(form, /transitionDealsMode\\(current, mode\\)/);
});

test("mobile homepage presentation has the approved compact hierarchy", () => {
  const labels = ["Flight + Hotel", "Flight + Hotel + Car", "Origin", "Destination", "Travel Dates", "Travelers &amp; Rooms", "Search deals"];
  let previous = -1;
  for (const label of labels) {
    const index = compact.indexOf(label);
    assert.ok(index > previous, `${label} should appear in order`);
    previous = index;
  }
  for (const excluded of ["deals.cabinClass", "driverAge", "pickupTime", "returnLocation", "round-trip"]) assert.doesNotMatch(compact, new RegExp(excluded));
});

test("compact controls reuse canonical pickers, summary, validation and submission", () => {
  assert.match(compact, /openFlightDates/);
  assert.match(compact, /openTravelers/);
  assert.match(compact, /travelerSummary/);
  assert.match(form, /validateDealsSearch\\(candidate\\)/);
  assert.match(form, /buildDealsJourneyUrl\\([\\s\\S]*?getFirstDealsJourneyStage/);
  assert.match(form, /removeDealsStagedJourneyPlan\\(\\)/);
});
