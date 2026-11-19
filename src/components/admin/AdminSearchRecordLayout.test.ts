import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchPage = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
const searchTable = readFileSync("src/components/admin/SearchMonitorTable.tsx", "utf8");
const handoffPage = readFileSync("src/app/admin/redirects/page.tsx", "utf8");

test("Search Records aligns date range beside product tabs, leaving four compact filters", () => {
  assert.match(searchPage, /data-testid="search-records-products-row"/);
  assert.match(searchPage, /data-testid="search-records-date-range"/);
  assert.match(searchPage, /lg:flex-row lg:items-center lg:justify-between/);
  assert.match(searchPage, /lg:w-\[164px\]/);
  assert.match(searchPage, /data-testid="search-records-filter-row"/);
  assert.match(searchPage, /lg:grid-cols-\[repeat\(4,minmax\(0,1fr\)\)_120px\]/);
  assert.equal((searchPage.match(/<SearchMonitorSelect label="Date range"/g) || []).length, 1);
  assert.ok(searchPage.indexOf('aria-label="Search products"') < searchPage.indexOf('data-testid="search-records-date-range"'));
  assert.ok(searchPage.indexOf('data-testid="search-records-date-range"') < searchPage.indexOf('data-testid="search-records-filter-row"'));
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
  assert.match(searchTable, /detailHref\(search, detailQuery\)/);
  assert.match(css, /@container \(max-width: 800px\)/);
  assert.match(css, /\.admin-search-records td \[data-search-route-preview\]/);
  assert.match(css, /white-space: nowrap/);
});

test("Provider Handoffs has a readable correlation and action column without squeezing table cells", () => {
  assert.match(handoffPage, /aria-label="Provider handoff records"/);
  assert.match(handoffPage, /min-w-\[1320px\] table-fixed/);
  assert.match(handoffPage, /<colgroup>/);
  assert.doesNotMatch(handoffPage, /className="admin-responsive-records mt-3/);
  assert.match(handoffPage, /whitespace-nowrap px-2 py-3/);
  assert.match(handoffPage, /handoffDetailHref\(handoff.id, handoff.environment, raw\)/);
});
