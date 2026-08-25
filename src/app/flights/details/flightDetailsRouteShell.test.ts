import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = "src/app/flights/details/[id]/page.tsx";
const clientPath = "src/components/results/FlightDetailsClient.tsx";
const detailsPath =
  "src/components/results/flightDetails/StandaloneFlightDetails.tsx";

test("Flight Details gives its global shell desktop-only display ownership", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(
    source,
    /<div className="hidden lg:block" data-flight-details-desktop-header>[\s\S]*?<AppHeader[\s\S]*?<\/div>/,
  );
  assert.match(
    source,
    /<div className="hidden lg:block" data-flight-details-desktop-footer>[\s\S]*?<Footer \/>[\s\S]*?<\/div>/,
  );
  assert.match(
    source,
    /className="pt-\[env\(safe-area-inset-top\)\] lg:pt-0"[\s\S]*?data-flight-details-mobile-safe-area[\s\S]*?<FlightDetailsClient id=\{id\} \/>[\s\S]*?<\/div>/,
  );

  assert.doesNotMatch(
    source,
    /(?:opacity-0|invisible|translate-|fixed|absolute|-left-|window\.innerWidth|matchMedia|navigator\.userAgent)/,
  );
  assert.doesNotMatch(source, /["']use client["']/);
});

test("Flight Details keeps page-owned results navigation for every details state", async () => {
  const [clientSource, detailsSource] = await Promise.all([
    readFile(clientPath, "utf8"),
    readFile(detailsPath, "utf8"),
  ]);

  assert.match(clientSource, /const resultsQuery = searchParams\.toString\(\)/);
  assert.match(
    clientSource,
    /resultsQuery \? `\/flights\/results\?\$\{resultsQuery\}` : "\/flights\/results"/,
  );
  assert.match(
    clientSource,
    /<StandaloneFlightDetails id=\{id\} resultsHref=\{resultsHref\} \/>/,
  );
  assert.match(detailsSource, /<FlightDetailsSkeleton resultsHref=\{resultsHref\} \/>/);
  assert.match(
    detailsSource,
    /<FlightDetailsUnavailable resultsHref=\{resultsHref\} message=\{error\} \/>/,
  );
  assert.match(detailsSource, /href=\{resultsHref\}[\s\S]*?Back to results/);
});

test("mobile Flight Details owns the top safe area for populated, loading, and unavailable states", async () => {
  const [pageSource, detailsSource] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(detailsPath, "utf8"),
  ]);

  assert.match(pageSource, /pt-\[env\(safe-area-inset-top\)\] lg:pt-0/);
  assert.equal(
    (pageSource.match(/env\(safe-area-inset-top\)/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(pageSource, /(?:h-|min-h-|pt-)\[(?:44|47|59|60|64|70)px\]/);

  assert.match(detailsSource, /return \(\s*<main[\s\S]*?Back to results/);
  assert.match(
    detailsSource,
    /if \(!response && !error\) return <FlightDetailsSkeleton resultsHref=\{resultsHref\} \/>/,
  );
  assert.match(
    detailsSource,
    /if \(!available \|\| !selectedOffer \|\| error && !response\) return <FlightDetailsUnavailable resultsHref=\{resultsHref\} message=\{error\} \/>/,
  );
  assert.match(
    detailsSource,
    /function FlightDetailsSkeleton[\s\S]*?Back to results/,
  );
  assert.match(
    detailsSource,
    /function FlightDetailsUnavailable[\s\S]*?Back to results/,
  );
});
