import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("guided and standalone Flights reuse FlightResultsClient in a presentation mode", async () => {
  const [client, stage] = await Promise.all([
    readFile(new URL("../FlightResultsClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("./DealsFlightResultsStage.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(client, /presentationMode\?: FlightResultsPresentationMode/);
  assert.match(client, /data-flight-results-experience="deals-guided"/);
  assert.match(stage, /<FlightResultsClient/);
  assert.doesNotMatch(
    stage,
    /replaceDealsFlightSelection|writeDealsStagedJourneyPlan|writeDealsTripPlan|removeDealsStagedJourneyPlan|markDealsProviderOpened/,
  );
});

test("guided Flight results use shortened visible copy and retain detailed accessible copy", async () => {
  const [stage, client, card, translations] = await Promise.all([
    readFile(new URL("./DealsFlightResultsStage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../FlightResultsClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../FlightCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../lib/i18n/en.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    translations,
    /"deals\.guided\.flightResults\.viewDetails": "View flight"/,
  );
  assert.match(
    translations,
    /"deals\.guided\.flightResults\.viewDetailsAria":\s*"View flight details for \{\{airline\}\}, \{\{origin\}\} to \{\{destination\}\}"/,
  );
  assert.match(
    stage,
    /actionLabel=\{t\("deals\.guided\.flightResults\.viewDetails"\)\}/,
  );
  assert.match(stage, /t\("deals\.guided\.flightResults\.viewDetailsAria"\)/);
  assert.doesNotMatch(client, /View flight/);
  assert.doesNotMatch(card, /View flight/);
});

test("guided Flight results suppress standalone-only UI and provider exits", async () => {
  const stage = await readFile(
    new URL("./DealsFlightResultsStage.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    stage,
    /DealsSearchForm|nearbyFare|recentSearch|savedTrip|priceAlert|FaqAccordion|bookingUrl|partnerRedirectUrl|api\/redirect/,
  );
  assert.match(
    await readFile(
      new URL("../FlightResultsClient.tsx", import.meta.url),
      "utf8",
    ),
    /showProviderHandoffCopy=\{false\}/,
  );
});

test("guided loaded Flight results hide only the redundant heading and preserve result controls and focus", async () => {
  const [client, stage, globals] = await Promise.all([
    readFile(new URL("../FlightResultsClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("./DealsFlightResultsStage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(
    stage,
    /<FlightResultsClient presentationMode="deals-guided"[\s\S]*?searchInput=\{searchInput\}[\s\S]*?buildDetailsHref=\{buildDetailsHref\}[\s\S]*?actionLabel=[\s\S]*?actionAriaLabel=\{actionAriaLabel\}/,
  );

  const loadedBranch = client.slice(
    client.indexOf("if (guidedMode) return (", client.indexOf("if (loading)")),
    client.indexOf(
      "if (!hasSearched)",
      client.indexOf(
        "if (guidedMode) return (",
        client.indexOf("if (loading)"),
      ),
    ),
  );
  assert.match(
    loadedBranch,
    /<section aria-labelledby="deals-guided-flight-results-heading" className="mt-0 lg:relative lg:left-1\/2 lg:w-\[min\(1180px,calc\(100vw-32px\)\)\] lg:-translate-x-1\/2" data-flight-results-experience="deals-guided">/,
  );
  assert.doesNotMatch(
    loadedBranch,
    /<section aria-labelledby="deals-guided-flight-results-heading" className="mt-6"/,
  );
  assert.match(
    loadedBranch,
    /<h2 id="deals-guided-flight-results-heading" ref=\{resultsHeadingRef\} tabIndex=\{-1\} className="sr-only">\{formatResultsFound\(sortedResults\.length, t\)\}<\/h2>/,
  );
  assert.match(
    loadedBranch,
    /<div className="flex items-center justify-between gap-4"><p className="text-\[16px\] font-semibold text-\[#142033\]">\{formatResultsFound\(sortedResults\.length, t\)\}<\/p>\{renderDesktopSortControl\(\)\}/,
  );
  assert.match(
    loadedBranch,
    /<div className="flex w-full flex-col gap-3 py-1">/,
  );
  const guidedGridOpeningTag = loadedBranch.match(
    /<div ref=\{resultsGridRef\} className="[^"]+">/,
  )?.[0];
  assert.ok(guidedGridOpeningTag, "guided results grid opening tag is present");
  assert.match(guidedGridOpeningTag, /className="grid /);
  assert.match(guidedGridOpeningTag, /lg:grid-cols-\[260px_minmax\(0,1fr\)\]/);
  assert.match(guidedGridOpeningTag, /lg:gap-x-6/);
  assert.doesNotMatch(guidedGridOpeningTag, /flight-results-grid/);
  assert.doesNotMatch(guidedGridOpeningTag, /lg:gap-x-9/);
  assert.match(globals, /\.flight-results-grid/);
  assert.match(
    client.slice(
      client.indexOf("return (", client.indexOf("if (!hasSearched)")),
    ),
    /ref=\{resultsGridRef\}[\s\S]*?className="flight-results-grid page-shell grid/,
  );
  assert.doesNotMatch(
    loadedBranch,
    /flex w-full flex-col gap-3 rounded-2xl border border-\[#D8E1EC\] bg-white p-3 shadow-sm sm:p-4 lg:bg-transparent/,
  );
  assert.match(
    loadedBranch,
    /<Button variant="secondary" className="h-10 rounded-xl border-slate-300 text-sm font-bold lg:hidden" onClick=\{\(event\) => openMobileFiltersDrawer\(event\.currentTarget\)\}/,
  );
  assert.match(
    loadedBranch,
    /<div className="lg:hidden">\{renderMobileSortResultsRow\(\)\}<\/div>/,
  );
  assert.match(loadedBranch, /<DesktopFlightFilters/);
  assert.match(loadedBranch, /id="flight-mobile-filters-dialog"/);
  assert.match(
    loadedBranch,
    /<FlightCard[\s\S]*?showProviderHandoffCopy=\{false\}/,
  );
  assert.match(
    client,
    /resultsHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(
    client,
    /if \(guidedMode\) return <section[\s\S]*?<h2 id="deals-guided-flight-results-heading" tabIndex=\{-1\} className="text-xl font-extrabold text-slate-950">\{t\("deals\.guided\.flightResults\.loadingTitle"\)\}<\/h2>/,
  );
  assert.match(
    loadedBranch,
    /<h2 ref=\{errorHeadingRef\} tabIndex=\{-1\} className="text-lg font-extrabold">/,
  );
  assert.match(
    loadedBranch,
    /<h2 ref=\{emptyHeadingRef\} tabIndex=\{-1\} className="text-lg font-extrabold text-slate-950">/,
  );
  assert.doesNotMatch(
    loadedBranch,
    /bookingUrl|partnerRedirectUrl|api\/redirect/,
  );
});

test("FlightCard action distinguishes undefined string and null contracts", async () => {
  const card = await readFile(
    new URL("../FlightCard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(card, /detailsHref\?: string \| null/);
  assert.match(card, /detailsHref === undefined \? `\/flights\/details/);
  assert.match(card, /detailsHref \? <LinkButton/);
  assert.match(card, /disabled aria-disabled="true"/);
});

test("guided shell renders real Flight details and downstream pending states inside the shell", async () => {
  const shell = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  const stage = await readFile(
    new URL("./DealsFlightDetailsStage.tsx", import.meta.url),
    "utf8",
  );
  const client = await readFile(
    new URL("../FlightDetailsClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shell, /<DealsFlightResultsStage search=\{search\}/);
  assert.match(shell, /<DealsFlightDetailsStage/);
  assert.match(shell, /<DealsCarResultsStage/);
  assert.match(shell, /<DealsReviewStage/);
  assert.doesNotMatch(shell, /data-deals-guided-flight-details-pending/);
  assert.match(client, /export function FlightDetailsExperience/);
  assert.match(stage, /<FlightDetailsExperience/);
  assert.doesNotMatch(
    stage,
    /replaceDealsFlightSelection|writeDealsStagedJourneyPlan|writeDealsTripPlan|removeDealsStagedJourneyPlan|markDealsProviderOpened|api\/redirect/,
  );
});
