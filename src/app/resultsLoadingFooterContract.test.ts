import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const products = [
  {
    route: "flights",
    client: "FlightResultsClient.tsx",
    loadingGuard: "if (resultsUiPreparing)",
  },
  {
    route: "hotels",
    client: "HotelResultsClient.tsx",
    loadingGuard: "if (loading)",
  },
  {
    route: "cars",
    client: "CarsResultsClient.tsx",
    loadingGuard: "if (isSearchSubmitting)",
  },
] as const;

for (const { route, client, loadingGuard } of products) {
  const page = readFileSync(
    new URL(`./${route}/results/page.tsx`, import.meta.url),
    "utf8",
  );
  const loading = readFileSync(
    new URL(`./${route}/results/loading.tsx`, import.meta.url),
    "utf8",
  );
  const clientSource = readFileSync(
    new URL(`../components/results/${client}`, import.meta.url),
    "utf8",
  );

  test(`${route} route loading keeps Header and loader visible without a Footer`, () => {
    assert.match(page, /<AppHeader/);
    assert.match(page, /<Suspense/);
    assert.doesNotMatch(page, /<Footer|brand-legal-only/);
    assert.match(loading, /<AppHeader/);
    assert.match(loading, /min-h-\[calc\(100svh-5rem\)\]/);
    assert.doesNotMatch(loading, /<Footer|brand-legal-only/);
  });

  test(`${route} standalone client excludes Footer from loading and owns one ready-state Footer`, () => {
    const loadingStart = clientSource.indexOf(loadingGuard);
    const readyFooter = '<Footer variant="brand-legal-only" />';
    const footerIndex = clientSource.indexOf(readyFooter, loadingStart);

    assert.ok(loadingStart >= 0, `${loadingGuard} must remain explicit`);
    assert.match(
      clientSource.slice(loadingStart, footerIndex),
      /<BrandedLoading/,
    );
    assert.doesNotMatch(
      clientSource.slice(loadingStart, footerIndex),
      /<Footer|brand-legal-only/,
    );
    assert.ok(footerIndex > loadingStart);
    assert.equal(clientSource.indexOf(readyFooter, footerIndex + 1), -1);
  });
}

test("guided Flight and Hotel Results return before standalone Footer ownership", () => {
  for (const client of ["FlightResultsClient.tsx", "HotelResultsClient.tsx"]) {
    const source = readFileSync(
      new URL(`../components/results/${client}`, import.meta.url),
      "utf8",
    );
    const footerIndex = source.indexOf('<Footer variant="brand-legal-only" />');
    const guidedBranch = source.slice(0, footerIndex);

    assert.match(guidedBranch, /if \(guided(?:Mode)?\)/);
  }
});

test("hotel navbar stays outside the inventory loading branch", () => {
  const source = readFileSync(new URL("../components/results/HotelResultsClient.tsx", import.meta.url), "utf8");
  const header = source.indexOf("<AppHeader");
  const content = source.indexOf("{loadingContent ?? <>");
  assert.ok(header >= 0 && content > header);
  assert.match(source, /loadingContent = \([\s\S]*?<BrandedLoading/);
  const page = readFileSync(new URL("./hotels/results/page.tsx", import.meta.url), "utf8");
  assert.match(page, /fallback=\{[\s\S]*?<AppHeader[\s\S]*?<LocalizedLoadingLabel/);
});

test("flight page keeps one results AppHeader mounted while inventory content loads", () => {
  const source = readFileSync(new URL("../components/results/FlightResultsClient.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("./flights/results/page.tsx", import.meta.url), "utf8");

  const pageHeader = page.indexOf("<AppHeader");
  const suspense = page.indexOf("<Suspense", pageHeader);
  assert.ok(pageHeader >= 0 && suspense > pageHeader);
  assert.match(page, /data-flight-results-mobile-nav-summary/);
  assert.match(page, /data-flight-results-mobile-nav-filters/);
  assert.match(page, /<FlightResultsClient externalResultsHeader \/>/);
  assert.doesNotMatch(page.slice(suspense), /fallback=\{[\s\S]*?<AppHeader/);

  assert.match(source, /externalResultsHeader\?: boolean/);
  assert.match(source, /guidedMode \|\| externalResultsHeader \? null : \([\s\S]*?<AppHeader/);
  assert.match(source, /const readyExternalMobileHeader =[\s\S]*?!resultsUiPreparing[\s\S]*?createPortal\(renderMobileRouteSummaryCard\(\), mobileNavSummaryTarget\)[\s\S]*?createPortal\(mobileResultsFiltersContent, mobileNavFiltersTarget\)/);
  assert.match(source, /const readyDesktopNavbarSearch =[\s\S]*?!resultsUiPreparing[\s\S]*?createPortal\(renderDesktopHeaderSearchBar\(\), desktopNavSearchTarget\)/);

  const loadingStart = source.indexOf("if (resultsUiPreparing) {");
  const guidedStart = source.indexOf("if (guidedMode) return (", loadingStart);
  const loadingBranch = source.slice(loadingStart, guidedStart);
  assert.match(loadingBranch, /\{standaloneResultsHeader\}[\s\S]*?<BrandedLoading/);
  assert.doesNotMatch(loadingBranch, /readyExternalMobileHeader|readyDesktopNavbarSearch|renderDesktopHeaderSearchBar\(\)|renderStickySearchPopoutOverlay\(\)/);

  assert.match(source, /\{standaloneResultsHeader\}\s*\{readyExternalMobileHeader\}\s*\{readyDesktopNavbarSearch\}[\s\S]*?<main data-flight-results-main/);
});
