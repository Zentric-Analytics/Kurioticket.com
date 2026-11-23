import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchPage = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
const searchTable = readFileSync("src/components/admin/SearchMonitorTable.tsx", "utf8");
const handoffPage = readFileSync("src/app/admin/redirects/page.tsx", "utf8");

test("Search Records keeps all six filters together and product tabs below the filter row", () => {
  assert.match(searchPage, /data-testid="search-records-products-row"/);
  assert.match(searchPage, /testId="search-records-date-range"/);
  assert.match(searchPage, /data-testid="search-records-filter-row"/);
  assert.match(searchPage, /lg:grid-cols-\[repeat\(5,minmax\(0,1fr\)\)_120px\]/);
  assert.equal((searchPage.match(/<AdminOperationalDateRangeFields/g) || []).length, 1);
  assert.match(readFileSync("src/components/admin/AdminOperationalDateRangeFields.tsx", "utf8"), /data-testid=\{testId\}/);
  assert.ok(searchPage.indexOf('data-testid="search-records-filter-row"') < searchPage.indexOf('testId="search-records-date-range"'));
  assert.ok(searchPage.indexOf('testId="search-records-date-range"') < searchPage.indexOf('aria-label="Search products"'));
  assert.match(searchPage, /href=\{productHref\(raw, item.value, range\)\}/);
  assert.doesNotMatch(searchPage, /Search records only<\/p>/);
  assert.match(searchPage, /Apply filters/);
});

test("Search Records fits its workspace with all ten fields visible and compact route labels", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(searchTable, /aria-label="Search activity table"/);
  assert.match(searchTable, /admin-responsive-records admin-search-records/);
  assert.match(searchTable, /w-full min-w-0 table-fixed border-collapse/);
  assert.doesNotMatch(searchTable, /min-w-\[1180px\]|overflow-x-auto/);
  assert.match(searchTable, /<colgroup>/);
  assert.equal((searchTable.match(/<th scope="col"/g) || []).length, 10);
  assert.equal((searchTable.match(/<td data-label=/g) || []).length, 10);
  assert.match(searchTable, /searchRoutePreview\(routeLabel\(search.origin, search.destination\)\)/);
  assert.match(searchTable, /title=\{routeLabel\(search.origin, search.destination\)\}/);
  assert.match(searchTable, /aria-label=\{routeLabel\(search.origin, search.destination\)\}/);
  assert.doesNotMatch(searchTable, /data-label="Duration"/);
  assert.match(searchTable, /data-label="Status"[\s\S]*?data-label="Action"[\s\S]*?View details <ChevronRight/);
  assert.match(searchTable, /detailHref\(search, detailQuery\)/);
  assert.match(css, /@container \(max-width: 800px\)/);
  assert.match(css, /\.admin-search-records td \[data-search-route-preview\]/);
  assert.match(css, /white-space: nowrap/);
});

test("Search Records metric headings and identity values stay on one line without table scroll", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const widthsMatch = searchTable.match(/\[13, 8, 11, 11, 9, 8, 10, 9, 10, 11\]/);
  assert.ok(widthsMatch, "Table columns must reserve sufficient width for metric headings");
  for (const column of ["Currency", "Results", "Providers", "Identity", "Action"]) {
    assert.ok(css.includes(`.admin-search-records td[data-label="${column}"]`), `${column} must not break its values`);
    assert.ok(searchTable.includes(`data-label="${column}"`), `${column} must remain in the table`);
  }
  assert.match(css, /\.admin-search-records thead th,/);
  assert.match(css, /white-space: nowrap;/);
  assert.match(css, /\.admin-handoff-records tbody > tr \{/);
  assert.match(css, /display: table-row;/);
  assert.doesNotMatch(searchTable, /min-w-\[1180px\]|overflow-x-auto/);
  assert.match(searchTable, /data-search-route-preview/);
});

test("Provider Handoffs retains all ten fields without a horizontally scrolling table", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(handoffPage, /aria-label="Provider handoff records"/);
  assert.match(handoffPage, /className="admin-handoff-records mt-3/);
  assert.match(handoffPage, /w-full min-w-0 table-fixed/);
  assert.doesNotMatch(handoffPage, /min-w-\[1320px\]|overflow-x-auto/);
  assert.match(handoffPage, /<colgroup>/);
  assert.equal((handoffPage.match(/<td data-label=/g) || []).length, 9);
  assert.match(handoffPage, /<th scope="row" data-label="Provider"/);
  assert.match(handoffPage, /data-handoff-compact/);
  assert.match(handoffPage, /adminHandoffRoutePreview\(handoff.route\)/);
  assert.match(handoffPage, /handoffDetailHref\(handoff.id, handoff.environment, scopedRaw\)/);
  assert.match(css, /\.admin-handoff-records tbody > tr \{/);
  assert.match(css, /display: table-row;/);
  assert.doesNotMatch(css.slice(css.indexOf("/* Keep Provider Handoffs as"), css.indexOf("/* Display ten characters")), /grid-template-columns/);
  assert.match(css, /\.admin-handoff-records td \[data-handoff-route-preview\]/);
});
