import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createDefaultDealsSearch, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import { getDealsResultsSummary } from "@/lib/deals/dealsResultsPresentation";
import { translations } from "@/lib/i18n/en";

const summarySource = readFileSync(new URL("./DealsResultsSearchSummary.tsx", import.meta.url), "utf8");
const breadcrumbsSource = readFileSync(new URL("./DealsResultsBreadcrumbs.tsx", import.meta.url), "utf8");
const inlineRoot = summarySource.slice(summarySource.indexOf("<div ref={visibleSummaryRef}"), summarySource.indexOf("</section>"));
const fixedRoot = summarySource.slice(summarySource.indexOf("aria-hidden={!desktopStickyVisible}"), summarySource.indexOf("type SummaryCellVariant"));
const summaryCell = summarySource.slice(summarySource.indexOf("type SummaryCellVariant"));
const inlineAction = inlineRoot.slice(inlineRoot.indexOf("<div className=\"flex shrink-0"));
const fixedAction = fixedRoot.slice(fixedRoot.indexOf("<div className=\"flex items-center px-3\""));
const base: DealsSearch = { ...createDefaultDealsSearch(), mode: "hotel-flight", flightOriginText: "Lagos", flightOriginCode: "LOS", flightDestinationText: "Los Angeles", flightDestinationCode: "LAX", flightDepartureDate: "2026-07-28", flightReturnDate: "2026-08-03", hotelDestination: "Los Angeles", hotelCheckIn: "2026-07-28", hotelCheckOut: "2026-08-03", flightAdults: 1, hotelAdults: 2, hotelRooms: 1 };

test("flight summary prioritizes route and represents aligned dates once", () => {
  const summary = getDealsResultsSummary(base, "en-US");
  assert.equal(summary.primary, "Lagos (LOS) → Los Angeles (LAX)");
  assert.deepEqual(summary.dates, [{ value: "Jul 28 – Aug 3" }]);
  assert.equal(summary.travelers, 1); assert.equal(summary.guests, 2); assert.equal(summary.rooms, 1);
  assert.equal(summary.carIncluded, false);
});

test("different flight and stay dates remain separately labelled", () => {
  const summary = getDealsResultsSummary({ ...base, hotelCheckOut: "2026-07-30" }, "en-US");
  assert.deepEqual(summary.dates.slice(0, 2).map(({ labelKey }) => labelKey), ["deals.results.summary.flightDates", "deals.results.summary.stayDates"]);
  assert.match(summary.dates[0]?.value ?? "", /Jul 28.*Aug 3/); assert.match(summary.dates[1]?.value ?? "", /Jul 28.*Jul 30/);
});

test("hotel and car summary prioritizes destination and excludes flight information", () => {
  const summary = getDealsResultsSummary({ ...base, mode: "hotel-car", carPickupDate: "2026-07-28", carReturnDate: "2026-07-30" }, "en-US");
  assert.equal(summary.primary, "Los Angeles"); assert.equal(summary.hasFlight, false); assert.equal(summary.travelers, undefined); assert.equal(summary.carIncluded, true);
});

test("the travel party summary localizes singular and plural guest counts", () => {
  assert.match(summarySource, /summary\.guests === 1 \? "deals\.results\.guest" : "deals\.results\.guests"/);
  assert.equal(translations["deals.results.guest"], "guest");
  assert.equal(translations["deals.results.guests"], "guests");
});

test("all four modify search launchers retain their accessible button contract without navigation", () => {
  assert.match(summarySource, /<button ref=\{modifyButtonRef\} type="button"/);
  assert.equal((summarySource.match(/type="button"/g) ?? []).length, 4);
  assert.equal((summarySource.match(/aria-expanded=\{modifyExpanded\}/g) ?? []).length, 4);
  assert.equal((summarySource.match(/aria-controls="deals-modify-search-dialog"/g) ?? []).length, 4);
  assert.doesNotMatch(summarySource, /href=/);
  assert.equal((summarySource.match(/min-h-11/g) ?? []).length, 2);
  assert.match(summarySource, /modifyButtonRef\.current = event\.currentTarget;\s*onModify\(\)/);
});

test("the inline responsive search surface remains sticky on mobile and static above mobile", () => {
  assert.equal((summarySource.match(/<button/g) ?? []).length, 4);
  assert.match(summarySource, /<section[^>]+className="sticky top-0 z-50[^"\n]+sm:static/);
  assert.match(summarySource, /const mobileDetails = \[dates, modeLabel, context\]\.filter\(Boolean\)\.join\(" · "\)/);
  assert.doesNotMatch(summarySource, /col-span-2[^"\n]+border-t[^"\n]+sm:hidden/);
});

test("the phone summary is one compact, overflow-safe row with an adaptive Modify action", () => {
  assert.match(summarySource, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(summarySource, /flex min-w-0 items-center gap-2\.5 px-3 py-2 sm:hidden/);
  assert.equal((summarySource.match(/title=\{mobileDetails\}/g) ?? []).length, 1);
  assert.match(summarySource, /title=\{summary\.primary\}[^>]+min-w-0 truncate/);
  assert.match(summarySource, /title=\{mobileDetails\}[^>]+min-w-0 truncate/);
  assert.match(summarySource, /import \{ CalendarDays, MapPin, PencilLine, Users \} from "lucide-react"/);
  assert.match(summarySource, /<PencilLine aria-hidden="true" className="h-5 w-5 sm:hidden"/);
  assert.match(summarySource, /aria-label=\{t\("deals\.results\.modify"\)\}/);
  assert.match(summarySource, /min-h-11 min-w-11/);
  assert.match(summarySource, /<span className="hidden sm:inline">\{t\("deals\.results\.modify"\)\}<\/span>/);
});

test("tablet and desktop use distinct flexible information layouts", () => {
  assert.match(summarySource, /sm:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(0,1fr\)_minmax\(0,1\.15fr\)_auto\]/);
  assert.match(summarySource, /lg:grid-cols-\[minmax\(0,0\.7fr\)_minmax\(0,1\.4fr\)_minmax\(0,1\.1fr\)_minmax\(0,1\.15fr\)_auto\]/);
  assert.doesNotMatch(summarySource, /sm:grid-cols-\[[^\]]+minmax\(\d+px/);
  assert.match(summarySource, /const packageAndParty = \[modeLabel, context\]\.filter\(Boolean\)\.join\(" · "\)/);
  assert.match(summarySource, /value=\{packageAndParty\}[^\n]+className="hidden sm:flex lg:hidden"/);
  assert.match(summarySource, /value=\{modeLabel\} className="hidden lg:flex"/);
  assert.match(summarySource, /value=\{context\}[^\n]+className="hidden lg:flex"/);
  assert.doesNotMatch(summarySource, /min-h-\[68px\]/);
});

test("inline desktop surface is full-width, enlarged, and content-safe without compact toolbar constraints", () => {
  assert.match(inlineRoot, /lg:min-h-\[80px\]/);
  assert.match(inlineRoot, /lg:grid-cols-\[minmax\(0,0\.7fr\)_minmax\(0,1\.4fr\)_minmax\(0,1\.1fr\)_minmax\(0,1\.15fr\)_auto\]/);
  assert.match(inlineRoot, /overflow-hidden/);
  assert.match(inlineRoot, /border border-slate/);
  assert.match(inlineRoot, /bg-white/);
  assert.match(inlineRoot, /rounded-xl/);
  assert.match(inlineRoot, /lg:rounded-2xl/);
  assert.match(inlineRoot, /lg:shadow-/);
  assert.doesNotMatch(inlineRoot, /(?:sm|md):min-h-\[80px\]/);
  assert.doesNotMatch(inlineRoot, /h-\[58px\]|max-w-\[980px\]/);
  assert.match(summarySource.slice(0, summarySource.indexOf("<div ref={visibleSummaryRef}")), /page-shell/);
});

test("summary cells keep inline labels visible and compact labels accessible but visually hidden", () => {
  assert.match(summaryCell, /type SummaryCellVariant = "inline" \| "compact"/);
  assert.match(summaryCell, /variant: SummaryCellVariant/);
  assert.match(summaryCell, /variant === "inline"/);
  assert.match(summaryCell, /min-w-0 items-center/);
  assert.match(summaryCell, /border-e border-slate/);
  assert.match(summaryCell, /px-3/);
  assert.match(summaryCell, /py-2 lg:gap-3 lg:px-5 lg:py-3\.5/);
  assert.match(summaryCell, /h-\[56px\]/);
  assert.match(summaryCell, /\[&>svg\]:h-4 \[&>svg\]:w-4/);
  assert.match(summaryCell, /lg:\[&>svg\]:h-5 lg:\[&>svg\]:w-5/);
  assert.match(summaryCell, /text-\[10px\][^\n]+tracking-\[0\.1em\]/);
  assert.match(summaryCell, /lg:text-\[11px\] lg:tracking-\[0\.11em\]/);
  assert.match(summaryCell, /text-sm font-semibold leading-tight/);
  assert.match(summaryCell, /lg:mt-1 lg:text-base lg:leading-6/);
  assert.match(summaryCell, /className="sr-only">\{label\}: <\/span>/);
  assert.doesNotMatch(summaryCell, /sr-only[^\n]+uppercase/);
  assert.match(summaryCell, /title=\{value\}/);
  assert.match(summaryCell, /block min-w-0 truncate whitespace-nowrap text-\[0\.86rem\] font-medium leading-5 text-slate-800/);
  assert.equal((inlineRoot.match(/<SummaryCell variant="inline"/g) ?? []).length, 5);
  assert.equal((fixedRoot.match(/<SummaryCell variant="compact"/g) ?? []).length, 4);
});

test("only the inline desktop Modify action gains larger spacing and typography", () => {
  assert.match(inlineAction, /lg:px-4/);
  assert.match(inlineAction, /lg:min-h-\[52px\]/);
  assert.match(inlineAction, /lg:px-6/);
  assert.match(inlineAction, /lg:text-base/);
  assert.match(inlineAction, /lg:rounded-xl/);
  assert.match(fixedAction, /px-3/);
  assert.match(fixedAction, /min-h-11[^\n]+px-4 text-sm/);
  assert.doesNotMatch(fixedAction, /lg:min-h-\[52px\]|lg:px-6|lg:text-base|lg:rounded-xl/);
  assert.equal((summarySource.match(/onClick=\{handleModify\}/g) ?? []).length, 4);
});

test("summary information uses sibling button triggers without nesting the Modify actions", () => {
  assert.match(inlineRoot, /<button data-deals-summary-trigger="inline"[^>]+onClick=\{handleModify\}[^>]+aria-expanded=\{modifyExpanded\}[^>]+aria-controls="deals-modify-search-dialog"[^>]*>[\s\S]*?<\/button>\s*<div className="flex shrink-0 items-center/);
  assert.match(fixedRoot, /<button data-deals-summary-trigger="sticky"[^>]+onClick=\{handleModify\}[^>]+aria-expanded=\{modifyExpanded\}[^>]+aria-controls="deals-modify-search-dialog"[^>]*>[\s\S]*?<\/button>\s*<div className="flex items-center px-3">/);
  assert.match(summaryCell, /return <span className=/);
});

test("desktop sticky visibility measures the translated inline summary surface", () => {
  assert.match(summarySource, /shouldShowDesktopStickySearch/);
  assert.match(summarySource, /<div ref=\{visibleSummaryRef\} className="grid[^"\n]+sm:translate-y-5/);
  assert.match(summarySource, /surface\.getBoundingClientRect\(\)\.bottom/);
  assert.match(summarySource, /viewportWidth: window\.innerWidth/);
  assert.match(summarySource, /formBottom: visibleSummaryBottom/);
});

test("desktop sticky measurement coordinates and cleans up browser observers and listeners", () => {
  assert.match(summarySource, /new IntersectionObserver\(schedule\)/);
  assert.match(summarySource, /window\.requestAnimationFrame\(measure\)/);
  assert.match(summarySource, /addEventListener\("scroll", schedule, \{ passive: true \}\)/);
  assert.match(summarySource, /addEventListener\("resize", schedule\)/);
  assert.match(summarySource, /observer\?\.disconnect\(\)/);
  assert.match(summarySource, /removeEventListener\("scroll", schedule\)/);
  assert.match(summarySource, /removeEventListener\("resize", schedule\)/);
  assert.match(summarySource, /window\.cancelAnimationFrame\(animationFrame\)/);
  assert.match(summarySource, /next !== previous/);
});

test("a separate compact toolbar is fixed, desktop-only, transitioned, and inert while hidden", () => {
  assert.match(summarySource, /pointer-events-none fixed inset-x-0 top-0/);
  assert.doesNotMatch(summarySource, /pointer-events-none fixed inset-x-0 top-3/);
  assert.match(summarySource, /hidden px-4 transition-all duration-200 motion-reduce:transition-none lg:block/);
  assert.match(summarySource, /desktopStickyVisible \? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"/);
  assert.match(summarySource, /aria-hidden=\{!desktopStickyVisible\}/);
  assert.match(summarySource, /inert=\{!desktopStickyVisible \? true : undefined\}/);
  assert.match(summarySource, /desktopStickyVisible \? "pointer-events-auto" : "pointer-events-none"/);
  assert.match(fixedRoot, /h-\[58px\]/);
  assert.match(fixedRoot, /max-w-\[920px\]/);
  assert.match(fixedRoot, /grid-cols-\[minmax\(110px,0\.7fr\)_minmax\(220px,1\.5fr\)_minmax\(150px,1fr\)_minmax\(190px,1\.25fr\)_auto\]/);
});

test("the desktop toolbar retains every Deals summary value and localized label", () => {
  assert.match(fixedRoot, /packages\.results\.summary\.package/);
  assert.match(fixedRoot, /value=\{modeLabel\}/);
  assert.match(fixedRoot, /summary\.routeLabelKey/);
  assert.match(fixedRoot, /value=\{summary\.primary\}/);
  assert.match(fixedRoot, /packages\.results\.summary\.travelDates/);
  assert.match(fixedRoot, /value=\{dates\}/);
  assert.match(fixedRoot, /packages\.results\.summary\.travelParty/);
  assert.match(fixedRoot, /value=\{context\}/);
});

test("breadcrumbs use localized semantic hierarchy", () => {
  assert.match(breadcrumbsSource, /<nav aria-label=\{t\("deals\.results\.breadcrumb\.label"\)\}/);
  assert.match(breadcrumbsSource, /<Link href="\/"/); assert.match(breadcrumbsSource, /<Link href="\/packages"/);
  assert.match(breadcrumbsSource, /aria-current="page"/); assert.match(breadcrumbsSource, /t\("deals\.results\.breadcrumb\.current"\)/);
  assert.equal(translations.home, "Home"); assert.equal(translations.deals, "Deals"); assert.equal(translations["deals.results.breadcrumb.current"], "Deals results");
});

test("route and breadcrumb presentation preserve RTL-safe direction contracts", () => {
  const summary = getDealsResultsSummary(base, "ar");
  assert.equal(summary.primary, "Lagos (LOS) → Los Angeles (LAX)");
  assert.match(summarySource, /dir=\{summary\.hasFlight \? "ltr"/);
  assert.match(breadcrumbsSource, /rtl:rotate-180/);
});
