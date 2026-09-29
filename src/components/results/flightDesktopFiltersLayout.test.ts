import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("desktop Flight filters keep long range values visibly separated", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );

  const priceSection = source.slice(
    source.indexOf('<SectionTitle>{t("price")}</SectionTitle>'),
    source.indexOf(
      '<OptionSection title={t("stops")}',
      source.indexOf('<SectionTitle>{t("price")}</SectionTitle>'),
    ),
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

  assert.match(facetRow, /min-h-11/);
  assert.match(facetRow, /flex min-w-0 flex-1 items-center/);
  assert.match(facetRow, /className="min-w-0 flex-1"/);
  assert.match(facetRow, /h-4 w-4 shrink-0/);
  assert.match(facetRow, /block break-words/);
  assert.match(facetRow, /shrink-0 text-xs/);
  assert.doesNotMatch(facetRow, /block truncate/);
});

test("desktop filter groups use sentence-case headings and accessible rows", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /rounded-2xl border border-\[#D8E1EC\] bg-white/);
  assert.match(source, /text-sm font-bold leading-5/);
  assert.doesNotMatch(source, /uppercase tracking-\[0\.12em\]/);
  assert.match(source, /min-h-11 w-full/);
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
