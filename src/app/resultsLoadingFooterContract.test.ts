import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = ["flights", "cars", "hotels"] as const;

for (const route of routes) {
  const page = readFileSync(
    new URL(`./${route}/results/page.tsx`, import.meta.url),
    "utf8",
  );
  const loading = readFileSync(
    new URL(`./${route}/results/loading.tsx`, import.meta.url),
    "utf8",
  );

  test(`${route} Results keeps Header visible and Footer exclusively in resolved Suspense content`, () => {
    const headerIndex = page.indexOf("<AppHeader");
    const suspenseIndex = page.indexOf("<Suspense");
    const suspenseEndIndex = page.indexOf("</Suspense>", suspenseIndex);
    const footerIndex = page.indexOf('<Footer variant="brand-legal-only" />');

    assert.ok(headerIndex >= 0 && headerIndex < suspenseIndex);
    assert.ok(footerIndex > suspenseIndex && footerIndex < suspenseEndIndex);
    assert.equal(page.indexOf("<Footer", suspenseEndIndex), -1);
    assert.match(loading, /<AppHeader/);
    assert.match(loading, /min-h-\[calc\(100svh-5rem\)\]/);
    assert.doesNotMatch(loading, /<Footer|brand-legal-only/);
  });
}
