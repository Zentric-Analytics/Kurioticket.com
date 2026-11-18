import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchPage = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
const searchTable = readFileSync("src/components/admin/SearchMonitorTable.tsx", "utf8");
const handoffPage = readFileSync("src/app/admin/redirects/page.tsx", "utf8");

test("Search Records filters keep the five selects and Apply filters in a desktop grid", () => {
  assert.match(searchPage, /lg:grid-cols-\[minmax\(0,1fr\).*?_auto\]/);
  assert.match(searchPage, /Apply filters/);
  assert.doesNotMatch(searchPage, /flex-wrap items-end gap-x-3/);
});

test("Search Records retains a fixed-width accessible table with independently sized columns", () => {
  assert.match(searchTable, /aria-label="Search activity table"/);
  assert.match(searchTable, /min-w-\[1180px\] table-fixed/);
  assert.match(searchTable, /<colgroup>/);
  assert.doesNotMatch(searchTable, /className="admin-responsive-records/);
  assert.match(searchTable, /overflow-x-auto/);
  assert.match(searchTable, /detailHref\(search, detailQuery\)/);
});

test("Provider Handoffs has a readable correlation and action column without squeezing table cells", () => {
  assert.match(handoffPage, /aria-label="Provider handoff records"/);
  assert.match(handoffPage, /min-w-\[1320px\] table-fixed/);
  assert.match(handoffPage, /<colgroup>/);
  assert.doesNotMatch(handoffPage, /className="admin-responsive-records mt-3/);
  assert.match(handoffPage, /whitespace-nowrap px-2 py-3/);
  assert.match(handoffPage, /handoffDetailHref\(handoff.id, handoff.environment, raw\)/);
});
