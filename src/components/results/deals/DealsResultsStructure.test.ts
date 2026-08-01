import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("./DealsPackageResultsToolbar.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./DealsPackageCard.tsx", import.meta.url), "utf8");
const pricePanel = readFileSync(new URL("./DealsPackagePricePanel.tsx", import.meta.url), "utf8");
const flightSummary = readFileSync(new URL("./DealsPackageFlightSummary.tsx", import.meta.url), "utf8");
const hotelSummary = readFileSync(new URL("./DealsPackageHotelSummary.tsx", import.meta.url), "utf8");
const carSummary = readFileSync(new URL("./DealsPackageCarSummary.tsx", import.meta.url), "utf8");
const skeleton = readFileSync(new URL("./DealsPreviewSkeleton.tsx", import.meta.url), "utf8");
const tripPlanBar = readFileSync(new URL("./DealsTripPlanBar.tsx", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../../../lib/deals/dealsPackageCardPresentation.ts", import.meta.url), "utf8");

test("package result states share one centered max-w-5xl width contract", () => {
  const wrapperStart = results.indexOf('<div className="page-shell max-w-5xl pt-5 sm:pt-6">');
  const wrapperEnd = results.indexOf("</section></div>", wrapperStart);
  const resultsWrapper = results.slice(wrapperStart, wrapperEnd);

  assert.ok(wrapperStart >= 0 && wrapperEnd > wrapperStart);
  assert.match(resultsWrapper, /page-shell max-w-5xl/);
  assert.doesNotMatch(resultsWrapper, /max-w-6xl/);
  assert.match(resultsWrapper, /<DealsPreviewSkeleton/);
  assert.match(resultsWrapper, /\{failed && <div/);
  assert.match(resultsWrapper, /!candidates\.length && <div/);
  assert.ok(resultsWrapper.indexOf("<DealsPackageResultsToolbar") < resultsWrapper.indexOf("<ol "));
  assert.match(resultsWrapper, /<div className="space-y-4"><DealsPackageResultsToolbar[\s\S]*<ol aria-label=/);
  assert.doesNotMatch(resultsWrapper, /(?:w|max-w)-\[(?:1024px|88%)\]/);
  assert.doesNotMatch(card, /\b(?:mx|ms|me)-\S+|translate-\S+/);
  assert.match(tripPlanBar, /\bmax-w-5xl\b/);
});

test("results render one combined package list after the shared search header", () => {
  const summary = results.indexOf("<DealsResultsSearchSummary");
  const breadcrumbs = results.indexOf("<DealsResultsBreadcrumbs", summary);
  const packages = results.indexOf('id="package-options"', breadcrumbs);
  assert.ok(summary >= 0 && summary < breadcrumbs && breadcrumbs < packages);
  assert.match(results, /buildDealsPackageCandidates/);
  assert.match(results, /<DealsPackageResultsToolbar/);
  assert.match(results, /<ol aria-label=/);
  assert.match(results, /sortedCandidates\.map\(candidate/);
  assert.doesNotMatch(results, /t\("deals\.results\.package\.intro"\)/);
  assert.doesNotMatch(results, /<h1 id="package-options"/);
  assert.doesNotMatch(results, /<DealsProductSection|<DealsPreviewRail/);
});

test("the borderless results toolbar is anchored to the package list by shared spacing", () => {
  const candidateBlock = results.slice(
    results.indexOf("{candidates.length > 0"),
    results.indexOf("</section>"),
  );
  const toolbarWrapper = toolbar.slice(
    toolbar.indexOf('<div className="flex min-w-0'),
    toolbar.indexOf("<p className=", toolbar.indexOf('<div className="flex min-w-0')),
  );
  const packageList = candidateBlock.slice(candidateBlock.indexOf("<ol "));

  assert.match(candidateBlock, /<div className="space-y-4"><DealsPackageResultsToolbar/);
  assert.ok(candidateBlock.indexOf("<DealsPackageResultsToolbar") < candidateBlock.indexOf("<ol "));
  assert.match(packageList, /className="space-y-4 sm:space-y-6"/);
  assert.doesNotMatch(packageList, /\bmt-4\b|\bsm:mt-6\b/);
  assert.doesNotMatch(toolbarWrapper, /\b(?:mt-5|py-3|border-y|border-t|border-b)\b/);
  assert.doesNotMatch(candidateBlock + toolbarWrapper, /<hr\b|\b-m[trblxy]?-[^\s"']+|\babsolute\b|\btransform\b/);
});

test("the anchored toolbar retains its count, sort control, and mode-specific options", () => {
  assert.match(toolbar, /complete trip \{count === 1 \? "option" : "options"\}/);
  assert.match(toolbar, /Sort by:/);
  assert.match(toolbar, /\{currentSortLabel\}/);
  assert.match(toolbar, /aria-haspopup="listbox"/);
  assert.match(toolbar, /aria-expanded=\{sortMenuOpen\}/);
  assert.match(toolbar, /role="listbox"/);
  assert.match(toolbar, /mode !== "hotel-car"/);
  assert.match(toolbar, /mode !== "flight-car"/);
  assert.match(toolbar, /mode !== "hotel-flight"/);
});

test("a package is selected atomically with every included product", () => {
  assert.match(results, /const selectPackage/);
  for (const product of ["flight", "hotel", "car"]) assert.match(results, new RegExp(`${product}: candidate\.${product}`));
  assert.match(results, /onSelect=\{\(\) => selectPackage\(candidate\)\}/);
  assert.match(results, /reconcileDealsCarSelection/);
});

test("combined cards disclose estimated totals and separate provider booking", () => {
  assert.match(pricePanel, /deals\.results\.package\.estimatedTotal/);
  assert.match(pricePanel, /deals\.results\.package\.disclosure/);
  assert.match(card, /view\.flight/);
  assert.match(card, /view\.hotel/);
  assert.match(card, /view\.car/);
  assert.match(pricePanel, /priceBreakdown/);
  assert.match(card, /candidate\.badgeKey/);
  assert.match(pricePanel, /deals\.results\.package\.providerPrice/);
  assert.match(pricePanel, /deals\.results\.package\.providerCount/);
  assert.match(pricePanel, /deals\.results\.package\.choose/);
  assert.match(pricePanel, /deals\.results\.package\.selected/);
  assert.match(pricePanel, /aria-pressed=\{selected\}/);
  assert.match(pricePanel, /selected && <Check aria-hidden/);
  assert.match(pricePanel, /candidate\.priceBreakdown\.map/);
  assert.doesNotMatch(card + pricePanel, /candidate\.reasonKey|deals\.results\.package\.providedBy|provider\(view\./);
  assert.doesNotMatch(card + pricePanel, /discount|saving|one checkout|one reservation/i);
  assert.doesNotMatch(flightSummary, /segments/);
});

test("package pricing uses a full-width summary before a content-height xl side panel", () => {
  assert.match(card, /xl:grid-cols-\[minmax\(0,1fr\)_288px\]/);
  assert.match(card, /xl:items-start/);
  assert.doesNotMatch(card, /lg:grid-cols-\[minmax\(0,1fr\)_260px\]/);
  assert.ok(card.indexOf("<DealsPackageFlightSummary") < card.indexOf("<DealsPackagePricePanel"));
  assert.ok(card.indexOf("<DealsPackageHotelSummary") < card.indexOf("<DealsPackagePricePanel"));
  assert.ok(card.indexOf("<DealsPackageCarSummary") < card.indexOf("<DealsPackagePricePanel"));

  assert.match(pricePanel, /xl:self-start/);
  assert.match(pricePanel, /md:grid-cols-\[minmax\(0,0\.8fr\)_minmax\(0,1\.2fr\)\]/);
  assert.match(pricePanel, /lg:grid-cols-\[minmax\(180px,0\.75fr\)_minmax\(300px,1\.15fr\)_minmax\(220px,0\.85fr\)\]/);
  assert.match(pricePanel, /xl:block/);
  assert.doesNotMatch(pricePanel, /\b(?:h-full|min-h-full|justify-between|justify-around|justify-evenly|mt-auto|flex-grow)\b/);
});

test("the loading card mirrors the compact responsive pricing layout", () => {
  assert.match(skeleton, /xl:grid-cols-\[minmax\(0,1fr\)_288px\]/);
  assert.match(skeleton, /xl:items-start/);
  assert.match(skeleton, /xl:self-start/);
  assert.match(skeleton, /md:grid-cols-\[minmax\(0,0\.8fr\)_minmax\(0,1\.2fr\)\]/);
  assert.match(skeleton, /lg:grid-cols-\[minmax\(180px,0\.75fr\)_minmax\(300px,1\.15fr\)_minmax\(220px,0\.85fr\)\]/);
  assert.doesNotMatch(skeleton, /lg:grid-cols-\[minmax\(0,1fr\)_260px\]/);
});

test("package cards use compact, content-driven vertical spacing", () => {
  assert.match(card, /gap-1\.5 border-b border-slate-100 px-4 py-2\.5/);
  assert.match(card, /xl:gap-4 xl:px-4 xl:py-3/);
  assert.doesNotMatch(card, /\bxl:p-4\b/);
  assert.match(flightSummary, /className="py-4 xl:py-3"/);
  assert.match(flightSummary, /mt-2 grid gap-x-6 gap-y-2/);
  assert.match(flightSummary, /cabinAndBaggageLabel && <p className="mt-2/);
  assert.match(hotelSummary, /className="py-4 xl:py-3"/);
  assert.match(carSummary, /className="py-4 xl:py-3"/);
  assert.match(pricePanel, /xl:self-start[^"]*xl:py-3/);
  assert.match(pricePanel, /\bmin-h-11\b/);
  assert.match(pricePanel, /deals\.results\.package\.disclosure/);

  assert.match(skeleton, /gap-1\.5 border-b px-4 py-2\.5/);
  assert.match(skeleton, /xl:gap-4 xl:px-4 xl:py-3/);
  assert.match(skeleton, /xl:self-start[^"]*xl:py-3/);

  const productionCard = card + flightSummary + hotelSummary + carSummary + pricePanel;
  assert.doesNotMatch(productionCard, /h-\[[^\]]+\]|max-h-|line-clamp-|truncate|overflow-clip|(?:^|\s)-m[trblxy]?-[^\s"']+|translate-|scale-/);
  assert.doesNotMatch(flightSummary + carSummary + pricePanel, /overflow-hidden/);
  assert.match(hotelSummary, /relative aspect-square overflow-hidden rounded-xl/);
  assert.doesNotMatch(pricePanel, /bg-slate-50|xl:rounded-xl|whitespace-nowrap/);
});

test("package imagery and typography use the readable card hierarchy", () => {
  assert.match(hotelSummary, /grid-cols-\[96px_minmax\(0,1fr\)\]/);
  assert.match(hotelSummary, /sm:grid-cols-\[120px_minmax\(0,1fr\)\]/);
  assert.match(hotelSummary, /lg:grid-cols-\[136px_minmax\(0,1fr\)\]/);
  assert.match(hotelSummary, /aspect-square/);
  assert.match(hotelSummary, /className="object-cover"/);
  assert.match(hotelSummary, /sizes="\(min-width: 1024px\) 136px, \(min-width: 640px\) 120px, 96px"/);
  assert.doesNotMatch(hotelSummary, /\b(?:w-full|h-screen)\b/);

  const productionCard = card + flightSummary + hotelSummary + carSummary + pricePanel;
  assert.doesNotMatch(productionCard, /text-\[11px\]/);
  assert.doesNotMatch(productionCard, /font-extrabold/);
  for (const summary of [flightSummary, hotelSummary, carSummary]) {
    assert.match(summary, /text-base font-semibold leading-6 text-slate-950/);
    assert.match(summary, /text-base font-semibold leading-[56] text-slate-950/);
    assert.match(summary, /text-sm font-medium text-\[#004BB8\]/);
  }
  assert.match(flightSummary + hotelSummary, /text-\[13px\] leading-5 text-slate-600/);
  assert.match(pricePanel, /text-\[13px\] leading-5 text-slate-600/);
});

test("pricing is plain, semantic, and lets long currency values wrap", () => {
  const aside = pricePanel.slice(pricePanel.indexOf("<aside"), pricePanel.indexOf(">", pricePanel.indexOf("<aside")) + 1);
  assert.doesNotMatch(aside, /bg-slate-50|xl:rounded-xl|(?:^|\s)xl:border(?:\s|")/);
  assert.match(aside, /xl:self-start/);
  assert.match(aside, /xl:border-s/);
  assert.match(aside, /xl:border-t-0/);
  assert.match(pricePanel, /<dl className=/);
  assert.match(pricePanel, /aria-pressed=\{selected\}/);
  assert.match(pricePanel, /selected && <Check aria-hidden/);
  assert.match(pricePanel, /aria-labelledby=\{`\$\{headingId\}-total-label`\}/);
  assert.doesNotMatch(pricePanel, /whitespace-nowrap|overflow-hidden|truncate|ellipsis/);
  assert.match(pricePanel, /grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\]/);
  assert.match(pricePanel, /min-w-0 break-words text-end tabular-nums/);
});

test("the skeleton mirrors the enlarged image and unboxed price area", () => {
  assert.match(skeleton, /grid-cols-\[96px_minmax\(0,1fr\)\]/);
  assert.match(skeleton, /sm:grid-cols-\[120px_minmax\(0,1fr\)\]/);
  assert.match(skeleton, /lg:grid-cols-\[136px_minmax\(0,1fr\)\]/);
  assert.match(skeleton, /aspect-square/);
  assert.doesNotMatch(skeleton, /bg-slate-50|xl:rounded-xl|xl:border xl:border-slate-200/);
  assert.match(skeleton, /xl:border-s xl:border-t-0/);
});

test("package cards remove the visible destination heading without losing header semantics or content", () => {
  assert.match(card, /<article aria-labelledby=\{view\.headingId\}/);
  assert.match(card, /<h2 id=\{view\.headingId\} className="sr-only">\{accessibleHeading\}<\/h2>/);
  assert.equal(card.match(/id=\{view\.headingId\}/g)?.length, 1);
  assert.doesNotMatch(card, /\{view\.header\.title\}/);
  assert.doesNotMatch(card, /text-lg font-extrabold text-slate-950/);
  assert.doesNotMatch(card + presentation, /Trip to|Complete trip/);
  assert.match(card, /candidate\.badgeKey/);
  assert.match(card, /view\.header\.modeLabel/);
  assert.match(card, /<CalendarDays aria-hidden/);
  assert.match(card, /view\.header\.dateRangeLabel/);
  assert.match(card, /view\.header\.stayDurationLabel &&/);
  for (const component of ["DealsPackageFlightSummary", "DealsPackageHotelSummary", "DealsPackageCarSummary", "DealsPackagePricePanel"]) {
    assert.match(card, new RegExp(`<${component}`));
  }
  assert.doesNotMatch(card, /<h2[^>]*>\s*<\/h2>|opacity-0|invisible/);
  assert.doesNotMatch(card, /<div className="[^"]*\b(?:min-)?h-\d+/);
  assert.match(card, /xl:grid-cols-\[minmax\(0,1fr\)_288px\]/);
  assert.match(card, /xl:items-start/);
  assert.match(skeleton, /xl:self-start/);
  assert.match(skeleton, /md:grid-cols-\[minmax\(0,0\.8fr\)_minmax\(0,1\.2fr\)\]/);
  assert.match(skeleton, /lg:grid-cols-\[minmax\(180px,0\.75fr\)_minmax\(300px,1\.15fr\)_minmax\(220px,0\.85fr\)\]/);
});
