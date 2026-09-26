import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile results rhythm has no decorative divider or oversized spacer", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-flight-mobile-summary-card/);
  assert.match(source, /h-\[4\.25rem\][\s\S]{0,260}rounded-xl/);
  assert.match(source, /relative translate-y-1\/2/);
  assert.match(source, /bg-white pb-0 pt-0 sm:hidden/);
  assert.match(source, /flight-results-grid page-shell grid[^\n]*pb-0 pt-8 sm:pb-5 sm:pt-5 lg:gap-x-9 lg:pt-6/);
  assert.doesNotMatch(source, /flight-results-grid page-shell grid[^\n]*pt-12/);
  assert.match(source, /data-flight-mobile-results-shortcuts/);
  assert.match(source, /pt-2/);
  assert.doesNotMatch(source, /data-flight-mobile-results-shortcuts[\s\S]{0,300}pt-12/);
});

test("mobile nearby insight, quick filters, and price alert use compact native-like rhythm", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(source, /cn\(resultStackClass, "space-y-1 sm:space-y-4"\)/);
  const nearbyInsight = source.match(/className="([^"]*)">Cheaper nearby:/)?.[1] ?? "";
  assert.match(nearbyInsight, /min-h-\[28px\]/);
  assert.match(nearbyInsight, /flight-mobile-cheaper-nearby/);
  assert.match(nearbyInsight, /font-medium/);
  assert.doesNotMatch(nearbyInsight, /text-\[\d+px\]|leading-\[\d+px\]/);
  assert.match(
    styles,
    /@media \(max-width: 639px\) \{[\s\S]*?\.flight-mobile-cheaper-nearby \{[\s\S]*?font-size: 11px !important;[\s\S]*?line-height: 15px !important;[\s\S]*?-webkit-text-size-adjust: none;[\s\S]*?text-size-adjust: none;[\s\S]*?\}/,
  );
  assert.match(source, /data-flight-mobile-results-shortcuts[\s\S]{0,350}py-1/);
  assert.match(source, /data-flight-mobile-results-intro[^\n]*space-y-3 pt-2/);
});

test("partial-provider warnings stay internal while genuine result failures remain visible", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /FLIGHT_PROVIDER_WARNING_TOAST_MS/);
  assert.doesNotMatch(source, /providerWarningVisible|setProviderWarningVisible/);
  assert.doesNotMatch(source, /data-flight-provider-warning-toast/);
  assert.doesNotMatch(source, /t\("limitedProviderChecks"\)/);
  assert.match(source, /error && results\.length === 0/);
  assert.match(source, /MobileFlightResultsState kind="error"/);
  assert.match(source, /results\.length === 0[\s\S]*?MobileFlightResultsState kind="empty"/);
});

test("Flight compact header uses the Hotel compact-header visual contract", async () => {
  const source = await readFile(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
  const start = source.indexOf("function renderMobileCompactResultsHeader()");
  const compactHeader = source.slice(start, source.indexOf("\n  function ", start + 10));
  assert.match(compactHeader, /bg-\[#F2F4F8\]/);
  assert.match(compactHeader, /text-\[15px\] font-bold leading-5 tracking-\[-0\.015em\] text-\[#07133B\]/);
  assert.match(compactHeader, /text-\[11px\] font-medium leading-4 text-\[#536B92\]/);
  assert.match(compactHeader, /data-flight-compact-edit-icon[\s\S]*?text-\[#536B92\]/);
  assert.match(compactHeader, /SlidersHorizontal[\s\S]*?text-\[#1a1a1a\]/);
});

test("mobile Flight Results uses the native horizontal gutter relationship", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  const card = await readFile(new URL("./MobileFlightCard.tsx", import.meta.url), "utf8");

  assert.match(styles, /@media \(max-width: 639px\) \{\s*\.flight-results-grid \{\s*width: min\(100% - 24px, 1560px\);/);
  assert.match(source, /min-h-\[28px\][^\n]*max-w-full[^\n]*px-0[^\n]*>Cheaper nearby:/);
  assert.match(source, /data-flight-mobile-results-shortcuts[\s\S]{0,500}px-0 py-1/);
  assert.match(source, /data-mobile-flight-shortcuts[^\n]*-me-4[^\n]*w-\[calc\(100%\+1rem\)\][^\n]*flex-nowrap[^\n]*gap-1\.5[^\n]*pe-4/);
  assert.doesNotMatch(source, /data-mobile-flight-shortcuts[^\n]*ps-3|flex w-max flex-nowrap/);
  assert.match(source, /data-flight-mobile-results-intro className="space-y-3 pt-2 sm:hidden"/);
  assert.doesNotMatch(source, /data-flight-mobile-results-intro[^\n]*px-3/);
  assert.match(source, /data-flight-price-alert-row className="max-sm:-mx-2 max-sm:w-\[calc\(100%\+16px\)\]"/);
  assert.match(source, /data-mobile-flight-results-summary-row\s*className="flex w-full/);
  assert.match(source, /data-flight-results-card-list className="max-sm:-mx-2 max-sm:w-\[calc\(100%\+16px\)\] space-y-3"/);
  assert.match(source, /data-mobile-paginated-flight-results[\s\S]{0,220}"pt-3"/);
  assert.match(source, /data-flight-results-skeleton-card-list className="max-sm:-mx-2 max-sm:w-\[calc\(100%\+16px\)\][^"]*sm:space-y-4"/);
  assert.match(source, /className=\{cn\("hidden sm:block", paginationRevealing/);
  assert.match(card, /block w-full rounded-2xl/);
});

test("Flight Results matches the Cars Back-to-top control", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /export const FLIGHT_BACK_TO_TOP_SCROLL_THRESHOLD = 320/);
  assert.match(source, /const \[showBackToTop, setShowBackToTop\] = useState\(false\)/);
  assert.match(source, /setShowBackToTop\(window\.scrollY >= FLIGHT_BACK_TO_TOP_SCROLL_THRESHOLD\)/);
  assert.match(source, /window\.addEventListener\("scroll", update, \{ passive: true \}\)/);
  assert.match(source, /!guidedMode && showBackToTop && !filtersOpen/);
  assert.match(source, /aria-label="Back to top"/);
  assert.match(source, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(source, /bottom-\[calc\(2rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(source, /end-4 z-40/);
  assert.match(source, /rounded-full/);
  assert.match(source, /sm:bottom-\[calc\(1rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(source, /<ArrowUp className="h-5 w-5" aria-hidden="true"/);
  const backToTopStart = source.indexOf('aria-label="Back to top"');
  const backToTopEnd = source.indexOf("</button>", backToTopStart);
  const backToTop = source.slice(backToTopStart, backToTopEnd);
  assert.doesNotMatch(backToTop, /sm:hidden|prefersReducedResultsMotion\(\) \? "auto" : "smooth"/);
  assert.doesNotMatch(source, /setShowBackToTop\(window\.scrollY > 600\)/);
  assert.match(source, /<Footer variant="brand-legal-only" \/>/);
});

test("Flight Results uses the normal AppHeader and the Cars summary below it", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(
    (source.match(/<AppHeader flushDesktopBottom flushMobileBottom hideDesktopTravelNav hideMobileCategoryTabs \/>/g) ?? []).length >= 2,
  );
  assert.doesNotMatch(source, /mobileResultsSearch=|mobileResultsLeadingAction=|mobileResultsSticky=/);
  assert.match(source, /relative z-40 bg-white pb-0 pt-0 sm:hidden/);
  assert.match(source, /relative translate-y-1\/2/);
});

test("mobile Flight Results uses the Cars-style scroll handoff header", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const appHeader = await readFile(
    new URL("../layout/AppHeader.tsx", import.meta.url),
    "utf8",
  );

  assert.match(appHeader, /mobileResultsSticky\?: boolean/);
  assert.match(appHeader, /mobileResultsSticky = true/);
  assert.match(
    appHeader,
    /mobileResultsSearch && mobileResultsSticky && "max-sm:sticky max-sm:top-0 max-sm:z-\[950\]"/,
  );

  assert.match(
    source,
    /const \[mobileCompactHeaderVisible, setMobileCompactHeaderVisible\] = useState\(false\)/,
  );
  assert.match(
    source,
    /const mobileSearchSummarySentinelRef = useRef<HTMLDivElement \| null>\(null\)/,
  );
  assert.match(source, /rect\.bottom < 8 && window\.scrollY > 96/);
  assert.match(source, /rootMargin: "-8px 0px 0px 0px"/);
  assert.match(source, /function renderMobileCompactResultsHeader\(\)/);
  assert.match(source, /data-flight-results-compact-header/);
  assert.match(
    source,
    /grid-cols-\[44px_minmax\(0,1fr\)_82px\]/,
  );
  assert.match(source, /\{mobileRouteSummary\}/);
  assert.match(source, /t\("deals\.results\.modifySearch"\)/);
  assert.match(source, /data-flight-compact-edit-icon/);
  assert.match(source, /openMobileSearchDrawer\(event\.currentTarget/);
  assert.match(source, /openMobileFiltersDrawer\(event\.currentTarget/);
  assert.match(source, /<span className="truncate">\{t\("filters"\)\}<\/span>/);
  assert.doesNotMatch(source, /mobileResultsSticky=|mobileResultsSearch=|mobileResultsLeadingAction=/);
  assert.match(source, /relative translate-y-1\/2/);
  assert.match(source, /ref=\{mobileSearchSummarySentinelRef\}/);
  assert.match(source, /\{renderMobileCompactResultsHeader\(\)\}/);
  assert.match(source, /fixed inset-x-0 top-0 z-\[90\] bg-\[#F2F4F8\] px-3 pb-2/);
  assert.match(source, /visible pointer-events-auto translate-y-0 opacity-100/);
  assert.match(source, /invisible pointer-events-none -translate-y-full opacity-0/);
  assert.match(source, /<ArrowLeft className="h-5 w-5" aria-hidden="true" \/>/);
  assert.match(source, /<Pencil[\s\S]*data-flight-compact-edit-icon/);
});

test("mobile Flight full-filter and quick-filter surfaces mirror Hotel visual contracts", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const sheet = await readFile(
    new URL("./MobileFlightFiltersSheet.tsx", import.meta.url),
    "utf8",
  );

  const fullStart = source.indexOf("function renderMobileFullFiltersSheet()");
  const fullEnd = source.indexOf("function renderDesktopSortControl()", fullStart);
  const full = source.slice(fullStart, fullEnd);
  assert.match(full, /fixed inset-0 z-\[9999\] bg-slate-950\/35/);
  assert.match(full, /h-\[95dvh\][^"]*rounded-t-\[20px\][^"]*bg-\[#F2F4F8\]/);
  assert.match(full, /relative flex h-16[^"]*bg-\[#F2F4F8\] px-5/);
  assert.match(full, /text-base font-semibold text-slate-950/);
  assert.match(full, /absolute right-3[^"]*h-11 w-11[^"]*rounded-lg/);
  assert.match(full, /px-6 py-4/);
  assert.match(full, /gap-3 border-t border-\[#D8DEE8\][^"]*shadow-\[0_-10px_24px_rgba\(15,23,42,0\.08\)\]/);
  assert.match(full, /h-11 w-\[30%\][^"]*rounded-lg[^"]*text-sm font-semibold text-slate-700/);
  assert.match(full, /h-11 min-w-0 flex-1 rounded-lg bg-\[#004BB8\][^"]*text-sm font-semibold text-white/);

  assert.match(sheet, /grid gap-6 bg-transparent/);
  assert.match(sheet, /text-lg font-semibold leading-6 text-slate-950/);
  assert.match(sheet, /min-h-11[^"]*text-sm font-normal text-slate-700/);
  assert.match(sheet, /border-\[#0067DB\] bg-\[#0067DB\] text-white/);
  assert.match(sheet, /border-slate-300 bg-white/);

  const quickStart = source.indexOf("function renderMobileSortResultsRow()");
  const quickEnd = source.indexOf("function renderFloatingFilterButton", quickStart);
  const quick = source.slice(quickStart, quickEnd);
  assert.match(quick, /border-\[#142033\] bg-\[#142033\] text-white/);
  assert.match(quick, /rounded-\[24px\] bg-\[#F2F4F8\] shadow-none mobile-results-sheet-surface mobile-results-sheet-surface-smooth/);
  assert.match(quick, /h-11 w-\[32%\][^"]*rounded-lg/);
  assert.match(quick, />Apply<\/button>/);
  assert.doesNotMatch(quick, /bg-\[#075EE8\]|bg-\[#EAF2FF\]/);
});

test("pagination uses an occluding full-page transition with an accessible status on mobile and desktop", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /createPortal\([\s\S]*<FlightResultsPageTransitionSkeleton/);
  assert.match(source, /data-flight-results-transition-cover/);
  assert.match(source, /fixed inset-0 z-\[9990\]/);
  assert.match(source, /className="sr-only" role="status" aria-live="polite"/);
  assert.match(source, /px-3 py-4 sm:px-4 sm:py-8/);
  assert.match(source, /<FlightCardSkeleton key=\{index\} \/>/);
  assert.doesNotMatch(source, /data-flight-results-transition-cover[\s\S]{0,220}hidden[\s\S]{0,120}sm:block/);
  assert.match(source, /motion-reduce:animate-none/);
});

test("desktop cards use one prominent stacked airline identity", async () => {
  const source = await readFile(new URL("./FlightCard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /flight-card-airline-name truncate whitespace-nowrap/);
  assert.match(source, /flight-card-flight-number[\s\S]*flight\.flightNumber/);
  assert.doesNotMatch(source, /flight-card-leg-logo|<AirlineLogo flight=\{flight\} inline/);
  assert.match(styles, /\.flight-card-header-logo \{\s*display: block;/);
  assert.match(styles, /\.flight-card-time \{\s*font-size: 1\.125rem;[\s\S]*white-space: nowrap;/);
});

test("desktop legs place factual departure and arrival dates beneath their airport codes", async () => {
  const source = await readFile(new URL("./FlightCard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  const leg = source.slice(source.indexOf("function ResponsiveFlightLegRow"), source.indexOf("function AirlineLogo"));

  assert.match(leg, /\{leg\.originAirport\}[\s\S]*flight-card-departure-date[\s\S]*formatItineraryShortDate\(\{ value: leg\.departureTime, locale \}\)/);
  assert.match(leg, /\{leg\.destinationAirport\}[\s\S]*flight-card-arrival-date[\s\S]*formatItineraryShortDate\(\{ value: leg\.arrivalTime, locale \}\)/);
  assert.match(styles, /\.flight-card-route-codes \{\s*display: none;/);
  assert.match(styles, /@media \(max-width: 1023px\)[\s\S]*\.flight-card-departure-date,\s*\.flight-card-arrival-date \{\s*display: block;[\s\S]*\.flight-card-route-codes \{\s*display: block;/);
});

test("desktop leg columns share strict time airport and date row tracks", async () => {
  const source = await readFile(new URL("./FlightCard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  const leg = source.slice(source.indexOf("function ResponsiveFlightLegRow"), source.indexOf("function AirlineLogo"));

  assert.match(leg, /flight-card-leg-endpoint[\s\S]*flight-card-time[\s\S]*leg\.originAirport[\s\S]*flight-card-departure-date/);
  assert.match(leg, /flight-card-leg-center[\s\S]*flight-card-duration[\s\S]*flight-card-path[\s\S]*flight-card-layover/);
  assert.match(leg, /flight-card-leg-endpoint[\s\S]*flight-card-time[\s\S]*leg\.destinationAirport[\s\S]*flight-card-arrival-date/);
  assert.match(styles, /\.flight-card-leg-endpoint,\s*\.flight-card-leg-center \{\s*display: grid;\s*grid-template-rows: 1\.75rem 1\.25rem 1\.25rem;/);
  assert.match(styles, /@media \(max-width: 1023px\)[\s\S]*\.flight-card-leg-endpoint,[\s\S]*\.flight-card-leg-center \{\s*display: block;/);
});

test("desktop departure metadata aligns directly beneath time with generous card rhythm", async () => {
  const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(styles, /\.flight-card-leg-grid > \.flight-card-leg-endpoint:first-child \.flight-card-airport,[\s\S]*margin-inline-start: 1\.875rem;/);
  assert.match(styles, /\.flight-card-leg-time-row \{\s*gap: 0\.5rem;/);
  assert.match(styles, /\.flight-card-desktop-header \{[\s\S]*padding-bottom: 0\.75rem;/);
  assert.match(styles, /\.flight-card-legs \{\s*grid-area: legs;\s*gap: 0\.75rem;/);
  assert.match(styles, /\.flight-card-details \{\s*column-gap: 1rem;\s*margin-top: 0\.5rem;\s*padding-top: 0\.5rem;/);
  assert.match(styles, /@media \(max-width: 1023px\)[\s\S]*\.flight-card-departure-date \{\s*margin-inline-start: 0;/);
});

test("desktop nearby fares use a contained mobile-like hierarchy", async () => {
  const source = await readFile(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
  const start = source.indexOf("data-desktop-nearby-fare-rail");
  const strip = source.slice(start, source.indexOf("Next nearby fare date", start) + 300);

  assert.match(strip, /rounded-2xl border border-slate-200\/90 bg-white/);
  assert.match(strip, /min-h-\[76px\]/);
  assert.match(strip, /border-l border-slate-100 bg-white/);
  assert.match(strip, /selected && "bg-blue-50\/55 after:scale-x-100/);
});
