import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const hotelSource = readFileSync(
  new URL("../search/HotelSearchBar.tsx", import.meta.url),
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
  assert.match(
    summary,
    /openMobileSearchDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)/,
  );
  assert.match(summary, /<SquarePen size=\{16\} strokeWidth=\{2\.2\} \/>/);
  assert.match(
    summary,
    /inline-flex h-11 w-11 shrink-0 items-center justify-center[^\n]*bg-transparent text-slate-700/,
  );
  assert.match(summary, /aria-hidden="true"/);
  assert.doesNotMatch(
    summary,
    /PencilLine|bg-\[#004BB8\]\/8|border-\[#004BB8\]\/12/,
  );
  assert.match(summary, /\[-webkit-tap-highlight-color:transparent\]/);
  assert.match(summary, /focus-visible:ring-2 focus-visible:ring-\[#004BB8\]\/35/);
  assert.doesNotMatch(summary, /group-active:bg-/);
});

test("normal Cars summary pins the current Hotel edit affordance contract", () => {
  for (const contract of [
    /<SquarePen size=\{16\} strokeWidth=\{2\.2\}/,
    /h-11 w-11/,
    /bg-transparent/,
    /text-slate-700/,
  ]) {
    assert.match(summary, contract);
    assert.match(hotelSource, contract);
  }
  assert.doesNotMatch(summary, /SquarePen[\s\S]{0,300}bg-\[#004BB8\]\/8/);
  assert.doesNotMatch(summary, /PencilLine|border-\[#004BB8\]\/12/);
});

test("normal Cars summary uses the Flights mobile presentation and remains mobile-only", () => {
  assert.match(summary, /h-\[4\.25rem\]/);
  assert.match(summary, /rounded-xl border border-slate-200\/80 bg-white/);
  assert.match(summary, /max-w-\[30rem\]/);
  assert.doesNotMatch(summary, /h-14[\s\S]*rounded-md/);
  assert.match(mobileSummarySection, /bg-white pb-0 pt-0 sm:hidden/);
  assert.match(mobileSummarySection, /relative translate-y-1\/2/);
  assert.match(summary, /text-\[16px\] font-bold[^\"]*text-\[#07133B\]/);
  assert.match(summary, /text-\[12\.5px\] font-medium[^\"]*text-\[#536B92\]/);
  assert.doesNotMatch(summary, /font-extrabold/);
});

test("summary sentinel remains a non-visual one-pixel sticky threshold", () => {
  assert.match(mobileSummarySection, /mobileSearchSummarySentinelRef/);
  assert.match(
    mobileSummarySection,
    /className="pointer-events-none h-px w-full"/,
  );
  assert.match(source, /setMobileCompactHeaderVisible/);
});

test("compact Cars header keeps one accessible center control with an inward-facing inline Pencil", () => {
  const compactStart = source.indexOf("const renderMobileCompactResultsHeader");
  const compactHeader = source.slice(
    compactStart,
    source.indexOf("return (", compactStart + 2500),
  );
  const centerLabelIndex = compactHeader.indexOf(
    "aria-label={modifySearchLabel}",
  );
  const centerButton = compactHeader.slice(
    compactHeader.lastIndexOf("<button", centerLabelIndex),
    compactHeader.indexOf("</button>", centerLabelIndex) + "</button>".length,
  );

  assert.match(compactHeader, /grid-cols-\[44px_minmax\(0,1fr\)_82px\]/);
  assert.match(compactHeader, /<ArrowLeft[^>]*aria-hidden="true"/);
  assert.match(compactHeader, /aria-label=\{modifySearchLabel\}/);
  assert.match(compactHeader, /text-\[15px\] font-bold/);
  assert.match(
    compactHeader,
    /<span>\{t\("deals\.results\.modifySearch"\)\}<\/span>[\s\S]*?<Pencil/,
  );
  assert.match(compactHeader, /data-cars-compact-edit-icon/);
  assert.match(compactHeader, /className="h-3 w-3 shrink-0 text-\[#536B92\]"/);
  assert.equal(centerButton.match(/<button/g)?.length, 1);
  assert.match(centerButton, /data-cars-compact-edit-icon/);
  assert.doesNotMatch(
    centerButton,
    /SquarePen|rounded[^\n]*data-cars-compact-edit-icon/,
  );
  assert.match(compactHeader, /openFiltersWithCount/);
  assert.match(compactHeader, /<SlidersHorizontal/);
});
