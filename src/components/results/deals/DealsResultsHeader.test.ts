import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createDefaultDealsSearch, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import { getDealsResultsSummary } from "@/lib/deals/dealsResultsPresentation";
import { translations } from "@/lib/i18n/en";

const summarySource = readFileSync(new URL("./DealsResultsSearchSummary.tsx", import.meta.url), "utf8");
const breadcrumbsSource = readFileSync(new URL("./DealsResultsBreadcrumbs.tsx", import.meta.url), "utf8");
const introSource = readFileSync(new URL("./DealsResultsIntro.tsx", import.meta.url), "utf8");
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

test("modify search retains its accessible button contract without navigation", () => {
  assert.match(summarySource, /<button ref=\{modifyButtonRef\} type="button"/);
  assert.match(summarySource, /aria-expanded=\{modifyExpanded\}/);
  assert.match(summarySource, /aria-controls="deals-modify-search-dialog"/);
  assert.doesNotMatch(summarySource, /href=/);
  assert.match(summarySource, /min-h-11/);
});

test("the single responsive search surface is genuinely sticky on mobile", () => {
  assert.equal((summarySource.match(/<button/g) ?? []).length, 1);
  assert.match(summarySource, /<section[^>]+className="sticky top-0 z-50[^"\n]+sm:static/);
});

test("breadcrumbs use localized semantic hierarchy", () => {
  assert.match(breadcrumbsSource, /<nav aria-label=\{t\("deals\.results\.breadcrumb\.label"\)\}/);
  assert.match(breadcrumbsSource, /<Link href="\/"/); assert.match(breadcrumbsSource, /<Link href="\/deals"/);
  assert.match(breadcrumbsSource, /aria-current="page"/); assert.match(breadcrumbsSource, /t\("deals\.results\.breadcrumb\.current"\)/);
  assert.equal(translations.home, "Home"); assert.equal(translations.deals, "Deals"); assert.equal(translations["deals.results.breadcrumb.current"], "Deals results");
});

test("intro retains the sole stable focusable results heading", () => {
  assert.match(introSource, /<h1 id="deals-trip-overview-heading" tabIndex=\{-1\}/);
  assert.equal((introSource.match(/<h1/g) ?? []).length, 1);
  assert.match(introSource, /deals\.results\.tripOptionsTitle/);
});

test("route and breadcrumb presentation preserve RTL-safe direction contracts", () => {
  const summary = getDealsResultsSummary(base, "ar");
  assert.equal(summary.primary, "Lagos (LOS) → Los Angeles (LAX)");
  assert.match(summarySource, /dir=\{summary\.hasFlight \? "ltr"/);
  assert.match(breadcrumbsSource, /rtl:rotate-180/);
});
