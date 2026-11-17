import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProductSearchRecordsPanel } from "./ProductSearchRecordsPanel";

const panelSource = readFileSync("src/components/admin/ProductSearchRecordsPanel.tsx", "utf8");
const hotelSource = readFileSync("src/app/admin/hotels/page.tsx", "utf8");
const carSource = readFileSync("src/app/admin/cars/page.tsx", "utf8");
const core = readFileSync("src/services/adminProductSearchRecordsCore.ts", "utf8");
const service = readFileSync("src/services/adminProductSearchRecordsService.ts", "utf8");
const listRoute = readFileSync("src/app/api/admin/providers/search-records/route.ts", "utf8");
const detailRoute = readFileSync("src/app/api/admin/providers/search-records/[id]/route.ts", "utf8");

test("both product pages remove redundant header search links without losing records or navigation isolation", () => {
  for (const source of [hotelSource, carSource]) {
    assert.doesNotMatch(source, /\/admin\/searches\/|\/admin\/journeys/);
    assert.doesNotMatch(source, /ProductSearchJumpLink|View hotel searches|View car searches/);
    assert.match(source, /<ProductSearchRecordsPanel product=/);
    assert.match(source, /<OperationsMetricStrip>/);
    assert.match(source, /<OperationsProviderIssues/);
  }
  assert.doesNotMatch(panelSource, /export function ProductSearchJumpLink/);
  assert.match(panelSource, /window.location.hash === "#" \+ sectionId/);
});

test("both product directories render independently accessible, responsive read-only record tables", () => {
  for (const product of ["HOTEL", "CAR"] as const) {
    const html = renderToStaticMarkup(createElement(ProductSearchRecordsPanel, { product }));
    assert.match(html, /Search exceptions and records/);
    assert.match(html, /Product search records table/);
    assert.match(html, /role="region"/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /overflow-x-auto/);
    assert.match(html, /Search records filters/);
    assert.match(html, /Refresh/);
    assert.match(html, /Page 1/);
    assert.doesNotMatch(html, /\/admin\/searches\/|\/admin\/journeys/);
  }
});

test("filters, cursor navigation and inline details retain only a single product", () => {
  assert.match(panelSource, /new URLSearchParams\(\{ product, filter, window: windowValue \}\)/);
  assert.match(panelSource, /new URLSearchParams\(\{ product \}\)/);
  assert.match(panelSource, /<Fragment key=\{record\.id\}>/);
  assert.match(panelSource, /aria-expanded=\{expanded\}/);
  assert.match(panelSource, /setSelectedId\(current => current === record\.id \? null : record\.id\)/);
  assert.match(panelSource, /setCursors\(current => \[\.\.\.current\.slice\(0, pageIndex \+ 1\), nextCursor\]\)/);
  assert.match(panelSource, /value: "ZERO_RESULTS"/);
  assert.match(panelSource, /value: "EXCEPTIONS"/);
  assert.match(panelSource, /value: "PARTIAL"/);
  assert.match(panelSource, /value: "FAILED"/);
  assert.match(panelSource, /role="alert"/);
  assert.doesNotMatch(panelSource, /router\.push|router\.replace|\/admin\/searches|\/admin\/journeys/);
});

test("both new Providers API endpoints independently authorize requests and restrict query scope", () => {
  assert.match(service, /requireAdminApiSession/);
  assert.match(service, /getOptionalPrisma/);
  assert.match(service, /getPublicEnvironment/);
  assert.match(core, /if \(!\(await deps\.authorize\(\)\)\)/);
  assert.match(core, /type: product/);
  assert.match(core, /query: \{ path: \["environment"\], equals: environment \}/);
  assert.match(core, /service: providerSearchService\(product\)/);
  assert.match(core, /metadata: \{ path: \["environment"\], equals: environment \}/);
  assert.doesNotMatch(core, /db\.user|db\.visitor|db\.supportTicket|db\.accountDeletionRequest/);
  assert.match(listRoute, /adminProductSearchRecords\.list/);
  assert.match(detailRoute, /adminProductSearchRecords\.detail/);
  assert.match(listRoute, /adminOperationalReadResponse/);
  assert.match(detailRoute, /adminOperationalReadResponse/);
  assert.doesNotMatch(listRoute + detailRoute, /POST|PATCH|DELETE/);
});
