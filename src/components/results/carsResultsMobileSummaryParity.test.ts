import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const summary = source.slice(
  source.indexOf("const renderMobileControlsRow"),
  source.indexOf("const renderCarsSearchForm"),
);
const mobileSummarySection = source.slice(
  source.indexOf('aria-label={t("carsResults.carRentalSearch")}') - 200,
  source.indexOf("<MobileDatePickerDialog"),
);

test("normal Cars mobile summary preserves Cars content and its actual Edit Search launcher", () => {
  assert.match(summary, /locationPairSummary/);
  assert.match(summary, /rentalDateSummary/);
  assert.match(summary, /driverAgeSummary/);
  assert.match(summary, /openMobileSearchDrawer\(event\.currentTarget\)/);
  assert.match(summary, /SquarePen size=\{15\} strokeWidth=\{2\.2\}/);
});

test("normal Cars summary uses the Flights mobile presentation and remains mobile-only", () => {
  assert.match(summary, /h-\[4\.25rem\]/);
  assert.match(summary, /rounded-xl border border-slate-200\/80 bg-white/);
  assert.match(summary, /max-w-\[30rem\]/);
  assert.doesNotMatch(summary, /h-14[\s\S]*rounded-md/);
  assert.match(mobileSummarySection, /bg-white pb-0 pt-0 sm:hidden/);
  assert.match(mobileSummarySection, /relative translate-y-1\/2/);
});

test("summary sentinel remains a non-visual one-pixel sticky threshold", () => {
  assert.match(mobileSummarySection, /mobileSearchSummarySentinelRef/);
  assert.match(
    mobileSummarySection,
    /className="pointer-events-none h-px w-full"/,
  );
  assert.match(source, /setMobileCompactHeaderVisible/);
});
