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
