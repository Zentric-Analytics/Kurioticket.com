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
  assert.match(source, /flight-results-grid page-shell grid[^\n]*pb-5 pt-8 sm:pt-5 lg:gap-x-9 lg:pt-6/);
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

  assert.match(source, /cn\(resultStackClass, "space-y-1 sm:space-y-4"\)/);
  assert.match(source, /min-h-\[28px\][^"]*text-\[9px\][^"]*font-medium[^"]*leading-\[12px\][^"]*">Cheaper nearby:/);
  assert.match(source, /data-flight-mobile-results-shortcuts[\s\S]{0,350}py-1/);
  assert.match(source, /data-flight-mobile-results-intro[^\n]*space-y-3 pt-2/);
});

test("partial-provider warning is a temporary overlay that never reserves results height", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const english = await readFile(
    new URL("../../lib/i18n/en.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export const FLIGHT_PROVIDER_WARNING_TOAST_MS = 4_000/);
  assert.match(source, /const \[providerWarningVisible, setProviderWarningVisible\] = useState\(false\)/);
  assert.match(source, /window\.setTimeout\([\s\S]*?FLIGHT_PROVIDER_WARNING_TOAST_MS/);
  assert.match(source, /data-flight-provider-warning-toast/);
  assert.match(source, /pointer-events-none fixed/);
  assert.match(source, /opacity-100/);
  assert.match(source, /opacity-0/);
  assert.doesNotMatch(source, /w-full rounded-xl border border-amber-200 bg-amber-50 p-3/);
  assert.match(
    english,
    /Some providers couldn’t be checked\. Showing available results\./,
  );
});

test("mobile Flight Results uses the native horizontal gutter relationship", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  const card = await readFile(new URL("./MobileFlightCard.tsx", import.meta.url), "utf8");

  assert.match(styles, /@media \(max-width: 639px\)[\s\S]*\.flight-results-grid \{\s*width: calc\(100% - 28px\);/);
  assert.match(source, /min-h-\[28px\][^\n]*max-w-full[^\n]*px-0[^\n]*>Cheaper nearby:/);
  assert.match(source, /data-flight-mobile-results-shortcuts[\s\S]{0,500}-mx-3[\s\S]{0,120}px-0/);
  assert.match(source, /data-mobile-flight-shortcuts[^\n]*ps-3 pe-4/);
  assert.match(source, /flex w-max flex-nowrap items-center gap-1\.5/);
  assert.match(source, /data-flight-mobile-results-intro className="space-y-3 pt-2 sm:hidden"/);
  assert.doesNotMatch(source, /data-flight-mobile-results-intro[^\n]*px-3/);
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
  assert.match(source, /bottom-\[calc\(3rem\+env\(safe-area-inset-bottom\)\)\]/);
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
  assert.match(source, /fixed inset-x-0 top-0 z-\[90\] bg-white px-3 pb-2/);
  assert.match(source, /<ArrowLeft className="h-5 w-5" aria-hidden="true" \/>/);
  assert.match(source, /<Pencil[\s\S]*data-flight-compact-edit-icon/);
});

test("mobile Flight full-filter and quick-filter popups use Cars visual contracts", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const sheet = await readFile(
    new URL("./MobileFlightFiltersSheet.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../../app/globals.css", import.meta.url),
    "utf8",
  );

  const fullStart = source.indexOf("function renderMobileFullFiltersSheet()");
  const fullEnd = source.indexOf("function renderDesktopSortControl()", fullStart);
  const full = source.slice(fullStart, fullEnd);
  assert.match(full, /bg-\[#F2F4F8\]/);
  assert.match(full, /min-h-\[76px\]/);
  assert.match(full, /text-\[18px\] font-bold leading-\[23px\] text-slate-950/);
  assert.match(full, /h-\[22px\] w-\[22px\]/);
  assert.match(full, /px-6 pb-8 pt-4/);
  assert.match(full, /gap-3\.5 border-t border-\[#D8DEE8\]/);
  assert.match(full, /min-h-\[50px\][^"]*bg-\[#004BB8\][^"]*text-base font-bold leading-\[22px\]/);

  assert.match(sheet, /grid gap-6 bg-transparent/);
  assert.match(sheet, /text-\[15px\] font-extrabold text-slate-950/);
  assert.match(sheet, /min-h-\[46px\]/);
  assert.match(sheet, /border-\[#D8DEE8\] bg-transparent/);
  assert.doesNotMatch(sheet, /data-mobile-flight-filter-footer|border-b border-slate-200 pb-6/);

  const quickStart = source.indexOf("const renderSortChoice =");
  const quickEnd = source.indexOf("function renderFloatingFilterButton", quickStart);
  const quick = source.slice(quickStart, quickEnd);
  assert.match(quick, /cars-native-quick-scrim/);
  assert.match(quick, /cars-native-quick-sheet/);
  assert.match(quick, /min-h-\[240px\]/);
  assert.match(quick, /max-h-\[min\(76dvh,620px\)\]/);
  assert.match(quick, /grid min-h-\[76px\][^"]*grid-cols-\[44px_minmax\(0,1fr\)_44px\]/);
  assert.match(quick, /min-h-\[52px\]/);
  assert.match(quick, /rounded-\[4px\] border-\[1\.5px\]/);
  assert.match(quick, /bg-\[#004BB8\]/);
  assert.doesNotMatch(quick, /bg-\[#075EE8\]/);

  assert.match(styles, /cars-native-quick-scrim-in[\s\S]*160ms ease-out/);
  assert.match(styles, /cars-native-quick-sheet-in[\s\S]*220ms ease-out/);
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
  assert.match(source, /px-\[14px\] py-4 sm:px-4 sm:py-8/);
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
