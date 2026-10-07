import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("desktop Flight filters keep long range values visibly separated", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );

  const priceStart = source.indexOf('<HotelStyleFilterSection title={t("price")}>');
  const priceSection = source.slice(
    priceStart,
    source.indexOf('<HotelStyleFilterSection title={t("duration")}>', priceStart),
  );
  assert.match(priceSection, /grid grid-cols-2 gap-4/);
  assert.match(priceSection, /tabular-nums/);
  assert.match(priceSection, /className="min-w-0 text-right"/);
  assert.doesNotMatch(priceSection, /flex justify-between/);

  assert.match(source, /presentationMode\?: "default" \| "deals-guided"/);
  assert.match(source, /presentationMode = "default"/);
  assert.match(source, /isGuidedComfortable && "text-\[13px\]"/);
});

test("facet rows reserve flexible copy space and a fixed count column", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );
  const facetRow = source.slice(source.indexOf("function FacetRow"));

  assert.match(facetRow, /min-h-\[30px\]/);
  assert.match(facetRow, /flex min-w-0 flex-1 items-start gap-2/);
  assert.match(facetRow, /peer sr-only/);
  assert.match(facetRow, /h-\[14px\] w-\[14px\]/);
  assert.match(facetRow, /border-\[#0067DB\] bg-\[#0067DB\] text-white/);
  assert.match(facetRow, /<Check className="h-2\.5 w-2\.5"/);
  assert.match(facetRow, /block break-words/);
  assert.match(facetRow, /min-w-6 shrink-0 text-right text-\[12px\]/);
  assert.doesNotMatch(facetRow, /block truncate/);
});

test("desktop filter groups use sentence-case headings and accessible rows", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-flight-hotel-filter-visual-parity/);
  assert.match(source, /overflow-hidden rounded-lg border border-\[#CFD9E5\] bg-\[#F2F4F8\]/);
  assert.match(source, /\{t\("hotelResults\.filterBy"\)\}/);
  assert.match(source, /text-\[13px\] font-bold leading-5 text-slate-950/);
  assert.match(source, /min-h-6 w-full items-center justify-between/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.doesNotMatch(source, /data-flight-hotel-filter-visual-parity[\s\S]{0,300}bg-white/);
  assert.doesNotMatch(source, /uppercase tracking-\[0\.12em\]/);
});

test("shared Flight filter surface stays muted while standalone desktop uses white", async () => {
  const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.match(
    styles,
    /\.desktop-filter-sidebar\[data-flight-hotel-filter-visual-parity\] \{[\s\S]*?border-color: #cfd9e5;[\s\S]*?border-radius: 0\.5rem;[\s\S]*?background: #f2f4f8;/,
  );
  assert.match(
    styles,
    /\[data-flight-results-main\]\s+\.desktop-filter-sidebar\[data-flight-hotel-filter-visual-parity\] \{\s*background: #ffffff;/,
  );
});

test("desktop Flight Hotel-style filter keeps Clear all and locale-safe unique panel ids", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );

  const primaryStart = source.indexOf("data-flight-hotel-filter-visual-parity");
  const primaryEnd = source.indexOf("function CompactFilterSection", primaryStart);
  const primary = source.slice(primaryStart, primaryEnd);
  const hotelSectionStart = source.indexOf("function HotelStyleFilterSection");
  const hotelSectionEnd = source.indexOf("function OptionSection", hotelSectionStart);
  const hotelSection = source.slice(hotelSectionStart, hotelSectionEnd);

  assert.match(primary, /hasActiveFilters[\s\S]*?aria-label="Reset filters"[\s\S]*?onClick=\{onClear\}[\s\S]*?\{t\("clearAll"\)\}/);
  assert.match(source, /import \{ useId, useMemo, useState \} from "react"/);
  assert.match(hotelSection, /const panelId = useId\(\)/);
  assert.match(hotelSection, /aria-controls=\{panelId\}/);
  assert.doesNotMatch(hotelSection, /title\.toLowerCase\(\)/);
});

test("alternate time mode control remains full width with comfortable guided sizing", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /min-h-7 w-full/);
  assert.match(source, /isGuidedComfortable && "min-h-9 text-\[13px\]"/);
  assert.match(
    source,
    /setTimeFilterMode\([\s\S]*?timeFilterMode === "takeoff"[\s\S]*?\? "landing"[\s\S]*?: "takeoff"[\s\S]*?\)/,
  );
});

test("desktop airline facets show counts without prices while retaining filter controls", async () => {
  const filters = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );
  const results = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const stops = filters.slice(
    filters.indexOf('<OptionSection title={t("stops")}'),
    filters.indexOf('<OptionSection title={t("airlines")}'),
  );
  const airlines = filters.slice(
    filters.indexOf('<OptionSection title={t("airlines")}'),
    filters.indexOf('<OptionSection title={t("airports")}'),
  );
  const airlineOptions = results.slice(
    results.indexOf("const airlineOptions = useMemo"),
    results.indexOf("const mobileAirlineOptions = useMemo"),
  );
  const mobileAirlineOptions = results.slice(
    results.indexOf("const mobileAirlineOptions = useMemo"),
    results.indexOf("const mobileFromAirportOptions = useMemo"),
  );

  assert.match(airlines, /count=\{option\.count\}/);
  assert.doesNotMatch(airlines, /secondaryLabel|rightLabel|t\("from"\)/);
  assert.match(airlines, /type="search"[\s\S]*setAirlineSearch/);
  assert.match(airlines, /showAllAirlines \? t\("hotelResults\.showLess"\) : t\("showMoreResults"\)/);
  assert.match(stops, /t\("from"\)\.toLowerCase\(\)[\s\S]*option\.rightLabel/);
  assert.match(airlineOptions, /const counts = new Map<string, number>\(\)/);
  assert.match(airlineOptions, /count,[\s\S]*\.sort\([\s\S]*\.slice\(0, 8\)/);
  assert.doesNotMatch(airlineOptions, /minPrice|rightLabel|getComparableFlightPrice/);
  assert.match(mobileAirlineOptions, /\(\{ value, label: value, count \}\)/);
  assert.doesNotMatch(mobileAirlineOptions, /rightLabel|minPrice/);
});
