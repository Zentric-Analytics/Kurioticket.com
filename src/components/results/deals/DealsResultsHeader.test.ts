import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  createDefaultDealsSearch,
  type DealsSearch,
} from "@/lib/deals/dealsSearchParams";
import { getDealsResultsSummary } from "@/lib/deals/dealsResultsPresentation";
import { translations } from "@/lib/i18n/en";

const summarySource = readFileSync(
  new URL("./DealsResultsSearchSummary.tsx", import.meta.url),
  "utf8",
);
const breadcrumbsSource = readFileSync(
  new URL("./DealsResultsBreadcrumbs.tsx", import.meta.url),
  "utf8",
);
const visibleSummaryRefIndex = summarySource.indexOf("ref={visibleSummaryRef}");
const inlineRoot = summarySource.slice(
  summarySource.lastIndexOf("<div", visibleSummaryRefIndex),
  summarySource.indexOf("</section>"),
);
const fixedRoot = summarySource.slice(
  summarySource.indexOf("aria-hidden={!desktopStickyVisible}"),
  summarySource.indexOf("type SummaryCellVariant"),
);
const summaryCell = summarySource.slice(
  summarySource.indexOf("type SummaryCellVariant"),
);
const base: DealsSearch = {
  ...createDefaultDealsSearch(),
  mode: "hotel-flight",
  flightOriginText: "Lagos",
  flightOriginCode: "LOS",
  flightDestinationText: "Los Angeles",
  flightDestinationCode: "LAX",
  flightDepartureDate: "2026-07-28",
  flightReturnDate: "2026-08-03",
  hotelDestination: "Los Angeles",
  hotelCheckIn: "2026-07-28",
  hotelCheckOut: "2026-08-03",
  flightAdults: 1,
  hotelAdults: 2,
  hotelRooms: 1,
};

test("flight summary prioritizes route and represents aligned dates once", () => {
  const summary = getDealsResultsSummary(base, "en-US");
  assert.equal(summary.primary, "Lagos (LOS) → Los Angeles (LAX)");
  assert.deepEqual(summary.dates, [{ value: "Jul 28 – Aug 3" }]);
  assert.equal(summary.travelers, 1);
  assert.equal(summary.guests, 2);
  assert.equal(summary.rooms, 1);
  assert.equal(summary.carIncluded, false);
});

test("different flight and stay dates remain separately labelled", () => {
  const summary = getDealsResultsSummary(
    { ...base, hotelCheckOut: "2026-07-30" },
    "en-US",
  );
  assert.deepEqual(
    summary.dates.slice(0, 2).map(({ labelKey }) => labelKey),
    ["deals.results.summary.flightDates", "deals.results.summary.stayDates"],
  );
  assert.match(summary.dates[0]?.value ?? "", /Jul 28.*Aug 3/);
  assert.match(summary.dates[1]?.value ?? "", /Jul 28.*Jul 30/);
});

test("hotel and car summary prioritizes destination and excludes flight information", () => {
  const summary = getDealsResultsSummary(
    {
      ...base,
      mode: "hotel-car",
      carPickupDate: "2026-07-28",
      carReturnDate: "2026-07-30",
    },
    "en-US",
  );
  assert.equal(summary.primary, "Los Angeles");
  assert.equal(summary.hasFlight, false);
  assert.equal(summary.travelers, undefined);
  assert.equal(summary.carIncluded, true);
});

test("the travel party summary localizes singular and plural guest counts", () => {
  assert.match(
    summarySource,
    /summary\.guests === 1 \? "deals\.results\.guest" : "deals\.results\.guests"/,
  );
  assert.equal(translations["deals.results.guest"], "guest");
  assert.equal(translations["deals.results.guests"], "guests");
});

test("four sibling controls open Modify Search without navigation", () => {
  assert.equal((summarySource.match(/type="button"/g) ?? []).length, 4);
  assert.equal(
    (summarySource.match(/onClick=\{handleModify\}/g) ?? []).length,
    4,
  );
  assert.equal(
    (summarySource.match(/aria-expanded=\{modifyExpanded\}/g) ?? []).length,
    4,
  );
  assert.equal(
    (summarySource.match(/aria-controls="deals-modify-search-dialog"/g) ?? [])
      .length,
    4,
  );
  assert.equal(
    (summarySource.match(/aria-label=\{t\("deals\.results\.modify"\)\}/g) ?? [])
      .length,
    3,
  );
  assert.doesNotMatch(summarySource, /href=/);
  assert.match(
    summarySource,
    /modifyButtonRef\.current = event\.currentTarget;\s*onModify\(\)/,
  );
});

const inlineMarkerIndex = inlineRoot.indexOf(
  'data-deals-summary-trigger="inline"',
);
const inlineTrigger = inlineRoot.slice(
  inlineRoot.lastIndexOf("<button", inlineMarkerIndex),
  inlineRoot.indexOf("</button>"),
);
const inlineAction = inlineRoot.slice(inlineRoot.indexOf("</button>") + 9);
const stickyMarkerIndex = fixedRoot.indexOf(
  'data-deals-summary-trigger="sticky"',
);
const stickyTrigger = fixedRoot.slice(
  fixedRoot.lastIndexOf("<button", stickyMarkerIndex),
  fixedRoot.indexOf("</button>"),
);
const fixedAction = fixedRoot.slice(fixedRoot.indexOf("</button>") + 9);

test("inline and sticky summary markers identify native accessible triggers", () => {
  for (const trigger of [inlineTrigger, stickyTrigger]) {
    assert.match(trigger, /type="button"/);
    assert.match(trigger, /onClick=\{handleModify\}/);
    assert.match(trigger, /aria-expanded=\{modifyExpanded\}/);
    assert.match(trigger, /aria-controls="deals-modify-search-dialog"/);
    assert.match(trigger, /focus-visible:ring-2/);
    assert.match(trigger, /focus-visible:ring-inset/);
    assert.match(trigger, /hover:bg-slate-50\/60/);
  }
});

test("summary triggers close before their sibling Modify buttons", () => {
  assert.doesNotMatch(inlineTrigger, /ref=\{modifyButtonRef\}/);
  assert.doesNotMatch(inlineTrigger, /<PencilLine/);
  assert.match(inlineAction, /ref=\{modifyButtonRef\}/);
  assert.match(inlineAction, /<PencilLine/);
  assert.doesNotMatch(stickyTrigger, /focus-ring inline-flex min-h-11/);
  assert.match(fixedAction, /focus-ring inline-flex min-h-11/);
});

test("the inline responsive search surface remains sticky on mobile and static above mobile", () => {
  assert.match(
    summarySource,
    /<section[\s\S]+className="sticky top-0 z-50[^"\n]+sm:static/,
  );
  assert.match(
    summarySource,
    /const mobileDetails = \[dates, modeLabel, context\]\.filter\(Boolean\)\.join\(" · "\)/,
  );
  assert.doesNotMatch(
    summarySource,
    /col-span-2[^"\n]+border-t[^"\n]+sm:hidden/,
  );
});

test("the phone information is inside the clickable compact row and keeps its pencil action", () => {
  assert.match(inlineRoot, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(
    inlineTrigger,
    /flex min-w-0 items-center gap-2\.5 px-3 py-2 sm:hidden/,
  );
  assert.match(
    inlineTrigger,
    /title=\{summary\.primary\}[\s\S]+min-w-0 truncate/,
  );
  assert.match(inlineTrigger, /title=\{mobileDetails\}[\s\S]+min-w-0 truncate/);
  assert.match(
    summarySource,
    /import \{ CalendarDays, MapPin, PencilLine, Users \} from "lucide-react"/,
  );
  assert.match(inlineAction, /<PencilLine[\s\S]+className="h-5 w-5 sm:hidden"/);
  assert.match(inlineAction, /min-h-11 min-w-11/);
  assert.match(inlineAction, /className="hidden sm:inline"/);
});

test("tablet and desktop information grids retain their proportions", () => {
  assert.match(
    inlineTrigger,
    /sm:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(0,1fr\)_minmax\(0,1\.15fr\)\]/,
  );
  assert.match(
    inlineTrigger,
    /lg:grid-cols-\[minmax\(0,0\.7fr\)_minmax\(0,1\.4fr\)_minmax\(0,1\.1fr\)_minmax\(0,1\.15fr\)\]/,
  );
  assert.match(
    summarySource,
    /const packageAndParty = \[modeLabel, context\]\.filter\(Boolean\)\.join\(" · "\)/,
  );
  assert.match(
    inlineTrigger,
    /value=\{packageAndParty\}[\s\S]+className="hidden sm:flex lg:hidden"/,
  );
  assert.match(
    inlineTrigger,
    /value=\{modeLabel\}[\s\S]+className="hidden lg:flex"/,
  );
  assert.match(
    inlineTrigger,
    /value=\{context\}[\s\S]+className="hidden lg:flex"/,
  );
});

test("inline desktop shell remains full-width, enlarged, and visually unchanged", () => {
  assert.match(inlineRoot, /lg:min-h-\[80px\]/);
  assert.match(inlineRoot, /overflow-hidden/);
  assert.match(inlineRoot, /border border-slate/);
  assert.match(inlineRoot, /bg-white/);
  assert.match(inlineRoot, /rounded-xl/);
  assert.match(inlineRoot, /lg:rounded-2xl/);
  assert.match(inlineRoot, /lg:shadow-/);
  assert.doesNotMatch(inlineRoot, /h-\[58px\]|max-w-\[980px\]/);
  assert.match(
    summarySource.slice(0, summarySource.indexOf("ref={visibleSummaryRef}")),
    /page-shell/,
  );
});

test("summary triggers retain every responsive information cell", () => {
  assert.equal((inlineTrigger.match(/<SummaryCell/g) ?? []).length, 5);
  assert.equal((inlineTrigger.match(/variant="inline"/g) ?? []).length, 5);
  assert.equal((stickyTrigger.match(/<SummaryCell/g) ?? []).length, 4);
  assert.equal((stickyTrigger.match(/variant="compact"/g) ?? []).length, 4);
  assert.match(inlineTrigger, /summary\.package/);
  assert.match(inlineTrigger, /summary\.routeLabelKey/);
  assert.match(inlineTrigger, /summary\.travelDates/);
  assert.match(inlineTrigger, /packageAndPartyLabel/);
  assert.match(inlineTrigger, /summary\.travelParty/);
});

test("presentational SummaryCells use button-safe span markup", () => {
  assert.match(summaryCell, /type SummaryCellVariant = "inline" \| "compact"/);
  assert.match(summaryCell, /return \([\s\S]+<span[\s\S]+min-w-0 items-center/);
  assert.match(summaryCell, /border-e border-slate/);
  assert.match(summaryCell, /py-2 lg:gap-3 lg:px-5 lg:py-3\.5/);
  assert.match(summaryCell, /h-\[56px\]/);
  assert.match(summaryCell, /className="sr-only"/);
  assert.doesNotMatch(summaryCell, /return <div/);
});

test("only the inline desktop Modify action gains larger spacing and typography", () => {
  assert.match(inlineAction, /lg:px-4/);
  assert.match(inlineAction, /lg:min-h-\[52px\]/);
  assert.match(inlineAction, /lg:px-6/);
  assert.match(inlineAction, /lg:text-base/);
  assert.match(fixedAction, /px-3/);
  assert.match(fixedAction, /min-h-11[\s\S]+px-4 text-sm/);
  assert.doesNotMatch(fixedAction, /lg:min-h-\[52px\]|lg:px-6|lg:text-base/);
});

test("desktop sticky visibility measures the unchanged outer summary surface", () => {
  assert.match(summarySource, /shouldShowDesktopStickySearch/);
  assert.match(
    summarySource,
    /ref=\{visibleSummaryRef\}[\s\S]+sm:translate-y-5/,
  );
  assert.match(summarySource, /surface\.getBoundingClientRect\(\)\.bottom/);
  assert.match(summarySource, /viewportWidth: window\.innerWidth/);
  assert.match(summarySource, /formBottom: visibleSummaryBottom/);
});

test("desktop sticky measurement coordinates and cleans up browser observers and listeners", () => {
  assert.match(summarySource, /new IntersectionObserver\(schedule\)/);
  assert.match(summarySource, /window\.requestAnimationFrame\(measure\)/);
  assert.match(
    summarySource,
    /addEventListener\("scroll", schedule, \{ passive: true \}\)/,
  );
  assert.match(summarySource, /addEventListener\("resize", schedule\)/);
  assert.match(summarySource, /observer\?\.disconnect\(\)/);
  assert.match(summarySource, /removeEventListener\("scroll", schedule\)/);
  assert.match(summarySource, /removeEventListener\("resize", schedule\)/);
  assert.match(summarySource, /window\.cancelAnimationFrame\(animationFrame\)/);
  assert.match(summarySource, /next !== previous/);
});

test("the compact toolbar remains fixed, desktop-only, transitioned, and inert while hidden", () => {
  assert.match(summarySource, /pointer-events-none fixed inset-x-0 top-0/);
  assert.match(
    summarySource,
    /hidden px-4 transition-all duration-200 motion-reduce:transition-none lg:block/,
  );
  assert.match(
    summarySource,
    /desktopStickyVisible[\s\S]+translate-y-0 opacity-100[\s\S]+-translate-y-3 opacity-0/,
  );
  assert.match(summarySource, /aria-hidden=\{!desktopStickyVisible\}/);
  assert.match(
    summarySource,
    /inert=\{!desktopStickyVisible \? true : undefined\}/,
  );
  assert.match(summarySource, /pointer-events-auto/);
  assert.match(fixedRoot, /h-\[58px\]/);
  assert.match(fixedRoot, /max-w-\[920px\]/);
  assert.match(
    stickyTrigger,
    /grid-cols-\[minmax\(110px,0\.7fr\)_minmax\(220px,1\.5fr\)_minmax\(150px,1fr\)_minmax\(190px,1\.25fr\)\]/,
  );
});

test("the desktop toolbar retains every Deals summary value and localized label", () => {
  assert.match(stickyTrigger, /deals\.results\.summary\.package/);
  assert.match(stickyTrigger, /value=\{modeLabel\}/);
  assert.match(stickyTrigger, /summary\.routeLabelKey/);
  assert.match(stickyTrigger, /value=\{summary\.primary\}/);
  assert.match(stickyTrigger, /deals\.results\.summary\.travelDates/);
  assert.match(stickyTrigger, /value=\{dates\}/);
  assert.match(stickyTrigger, /deals\.results\.summary\.travelParty/);
  assert.match(stickyTrigger, /value=\{context\}/);
});

test("breadcrumbs use localized semantic hierarchy", () => {
  assert.match(
    breadcrumbsSource,
    /<nav aria-label=\{t\("deals\.results\.breadcrumb\.label"\)\}/,
  );
  assert.match(breadcrumbsSource, /<Link href="\/"/);
  assert.match(breadcrumbsSource, /<Link href="\/deals"/);
  assert.match(breadcrumbsSource, /aria-current="page"/);
  assert.match(breadcrumbsSource, /t\("deals\.results\.breadcrumb\.current"\)/);
  assert.equal(translations.home, "Home");
  assert.equal(translations.deals, "Deals");
  assert.equal(
    translations["deals.results.breadcrumb.current"],
    "Deals results",
  );
});

test("route and breadcrumb presentation preserve RTL-safe direction contracts", () => {
  const summary = getDealsResultsSummary(base, "ar");
  assert.equal(summary.primary, "Lagos (LOS) → Los Angeles (LAX)");
  assert.match(summarySource, /dir=\{summary\.hasFlight \? "ltr"/);
  assert.match(breadcrumbsSource, /rtl:rotate-180/);
});
