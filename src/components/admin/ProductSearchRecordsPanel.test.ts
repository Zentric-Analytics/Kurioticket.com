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
    assert.doesNotMatch(source, /<OperationsProviderIssues|Provider exceptions/);
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

test("hotel and car records retain aligned columns and readable full record values", () => {
  for (const product of ["HOTEL", "CAR"] as const) {
    const html = renderToStaticMarkup(createElement(ProductSearchRecordsPanel, { product }));
    assert.match(html, /min-w-\[920px\] table-fixed/);
    assert.match(html, /<colgroup>/);
    assert.equal((html.match(/<col class="w-\[/g) || []).length, 7);
    assert.match(html, /text-right[^"]*"[^>]*>Results<\/th>/);
    assert.match(html, /text-right[^"]*"[^>]*>Latency<\/th>/);
    assert.match(html, /text-center[^"]*"[^>]*>Action<\/th>/);
    assert.match(html, /overscroll-x-contain/);
    assert.doesNotMatch(html, /class="admin-responsive-records/);
    assert.match(html, /Search records filters/);
  }
  assert.match(panelSource, /<time dateTime=\{record.createdAt \?\? undefined\}/);
  assert.match(panelSource, /title=\{record.requestId\}/);
  assert.match(panelSource, /setSelectedId\(current => current === record.id \? null : record.id\)/);
  assert.match(panelSource, /min-w-0 break-words px-3 py-3/);
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

test("hotel and car search filters keep draft selections until Apply filters", () => {
  assert.match(panelSource, /const \[draftFilter, setDraftFilter\] = useState<ProductSearchFilter>\("EXCEPTIONS"\)/);
  assert.match(panelSource, /const \[draftWindow, setDraftWindow\] = useState<ProductSearchWindow>\("today"\)/);
  assert.match(panelSource, /value=\{draftFilter\}/);
  assert.match(panelSource, /value=\{draftWindow\}/);
  assert.match(panelSource, /setDraftFilter\(value as ProductSearchFilter\)/);
  assert.match(panelSource, /setDraftWindow\(value as ProductSearchWindow\)/);
  assert.match(panelSource, /const applyFilters = \(\) => \{/);
  assert.match(panelSource, /setFilter\(draftFilter\)/);
  assert.match(panelSource, /setWindowValue\(draftWindow\)/);
  assert.match(panelSource, /onClick=\{applyFilters\}/);
  assert.match(panelSource, /Apply filters/);
  assert.match(panelSource, /sm:grid-cols-\[minmax\(0,180px\)_minmax\(0,180px\)_auto\]/);
  // Requests use applied state and do not depend on the draft values.
  assert.match(panelSource, /new URLSearchParams\(\{ product, filter, window: windowValue \}\)/);
  assert.match(panelSource, /\[product, filter, windowValue, cursor, reload, timeZone\]/);
});
